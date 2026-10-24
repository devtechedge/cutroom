import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { useEditor } from "../state/editor";
import { ASPECT_VALUE, frameNumber } from "../model/geometry";
import type { AssetResolver } from "../render/primitives";
import { FrameArtView } from "./FrameView";
import { Icon } from "./Icon";
import { Backdrop, LiveStatus } from "./ui";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface PreviewProps {
  resolve: AssetResolver;
  onClose: () => void;
}

export function Preview({ resolve, onClose }: PreviewProps): JSX.Element {
  const ed = useEditor();
  const { sb } = ed;
  const [index, setIndex] = useState(ed.frameIndex >= 0 ? ed.frameIndex : 0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [progress, setProgress] = useState(0); // seconds into current frame
  const [overlay, setOverlay] = useState<{ key: number; kind: "dissolve" | "slide"; frameIndex: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef<{ last: number } | null>(null);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const [fitHeight, setFitHeight] = useState(480);

  const frames = sb.frames;
  const frame = frames.at(Math.min(index, frames.length - 1));
  const totalSeconds = frames.reduce((s, f) => s + f.duration, 0);

  useLayoutEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const measure = (): void => {
      const parent = el.parentElement;
      if (!parent) return;
      setFitHeight(Math.max(200, parent.clientHeight - 8));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback(
    (next: number, withTransition: boolean) => {
      const clamped = (next + frames.length) % frames.length;
      setIndex(clamped);
      setProgress(0);
      const target = frames.at(clamped);
      if (withTransition && !reduceMotion && target && target.transitionIn !== "cut") {
        setOverlay({ key: Date.now(), kind: target.transitionIn === "dissolve" ? "dissolve" : "slide", frameIndex: index });
      }
    },
    [frames, index, reduceMotion],
  );

  // playback clock
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      clockRef.current = null;
      return;
    }
    clockRef.current = { last: performance.now() };
    const tick = (now: number): void => {
      const clock = clockRef.current;
      if (!clock) return;
      const dt = (now - clock.last) / 1000;
      clock.last = now;
      setProgress((p) => {
        const current = frames.at(Math.min(index, frames.length - 1));
        if (!current) return 0;
        const nextP = p + dt;
        if (nextP >= current.duration) {
          if (index === frames.length - 1 && !loop) {
            setPlaying(false);
            return current.duration;
          }
          goTo(index + 1, true);
          return 0;
        }
        return nextP;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, index, loop, frames, goTo]);

  // focus management
  useEffect(() => {
    const previous = document.activeElement;
    const node = rootRef.current;
    (node?.querySelector<HTMLElement>(FOCUSABLE) ?? node)?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  // keyboard: Escape/Tab trap plus transport controls, document-scoped
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && rootRef.current) {
        const items = [...rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPlaying(false);
        goTo(index + 1, true);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPlaying(false);
        goTo(index - 1, true);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [index, goTo, onClose]);

  if (!frame) {
    return createPortal(<div />, document.body);
  }

  // Fit: art height limited by viewport; zoom multiplies.
  const artHeight = fitHeight * zoom;
  const artWidth = artHeight * ASPECT_VALUE[sb.aspect];

  const elapsedBefore = frames.slice(0, index).reduce((s, f) => s + f.duration, 0);
  const scrubValue = elapsedBefore + Math.min(progress, frame.duration);
  const counter = `${frameNumber(index)} / ${frameNumber(frames.length - 1)}`;

  return createPortal(
    <Backdrop onClose={onClose}>
      <div className="dialog preview-dialog" role="dialog" aria-modal="true" aria-label={`Preview: ${sb.title}`} ref={rootRef} tabIndex={-1}>
        <div className="dialog-head">
          <h2>{sb.title}</h2>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-low)" }}>
            {sb.aspect}
          </span>
          <span style={{ flex: 1 }} />
          <div className="seg" role="group" aria-label="Preview size">
            {[1, 1.25, 1.5].map((z) => (
              <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)}>
                {z === 1 ? "Fit" : `${z * 100}%`}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">
            <Icon name="close" />
          </button>
        </div>
        <div className="preview-stage">
          <div className="preview-frame-holder" ref={holderRef} style={{ width: Math.round(artWidth), height: Math.round(artHeight) }}>
            <FrameArtView frame={frame} aspect={sb.aspect} resolve={resolve} title={`Preview frame ${frameNumber(index)}`} />
            {overlay && (
              <div key={overlay.key} className={`preview-layer ${overlay.kind}`} onAnimationEnd={() => setOverlay(null)} aria-hidden="true">
                <FrameArtView frame={frames[overlay.frameIndex] ?? frame} aspect={sb.aspect} resolve={resolve} />
              </div>
            )}
          </div>
        </div>
        <div className="preview-caption">{frame.caption.visible ? frame.caption.text : ""}</div>
        <div className="preview-controls">
          <button type="button" className="icon-btn" aria-label="Previous frame" onClick={() => { setPlaying(false); goTo(index - 1, true); }}>
            <Icon name="prev" />
          </button>
          <button type="button" className="icon-btn" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
            <Icon name={playing ? "pause" : "play"} />
          </button>
          <button type="button" className="icon-btn" aria-label="Next frame" onClick={() => { setPlaying(false); goTo(index + 1, true); }}>
            <Icon name="next" />
          </button>
          <button type="button" className="icon-btn" aria-label={loop ? "Loop on" : "Loop off"} aria-pressed={loop} onClick={() => setLoop((l) => !l)}>
            <Icon name="loop" />
          </button>
          <span className="preview-counter mono" aria-live="off">
            {counter}
          </span>
          <input
            className="preview-scrub"
            type="range"
            min={0}
            max={Math.max(totalSeconds, 0.1)}
            step={0.05}
            value={scrubValue}
            aria-label="Scrub the sequence"
            onChange={(e) => {
              const t = Number(e.target.value);
              let acc = 0;
              let idx = 0;
              for (let i = 0; i < frames.length; i++) {
                if (t < acc + frames[i].duration) {
                  idx = i;
                  break;
                }
                acc += frames[i].duration;
                idx = i;
              }
              setPlaying(false);
              setIndex(idx);
              setProgress(Math.max(0, t - acc));
            }}
          />
          <span className="preview-counter mono">{scrubValue.toFixed(1)}s</span>
        </div>
        <LiveStatus message={playing ? "Playing" : `Frame ${index + 1} of ${frames.length}`} />
      </div>
    </Backdrop>,
    document.body,
  );
}
