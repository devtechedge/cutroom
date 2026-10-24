import { useRef, useState, type JSX, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useEditor } from "../state/editor";
import * as ops from "../model/ops";
import { newFrame } from "../model/defaults";
import { frameNumber, formatSeconds } from "../model/geometry";
import type { AssetResolver } from "../render/primitives";
import { FrameArtView } from "./FrameView";
import { Icon } from "./Icon";
import { LiveStatus } from "./ui";

export interface TimelineProps {
  resolve: AssetResolver;
}

interface DragInfo {
  fromIndex: number;
  pointerId: number;
  insertAt: number;
  active: boolean;
}

export function Timeline({ resolve }: TimelineProps): JSX.Element {
  const ed = useEditor();
  const { sb, frame, frameIndex } = ed;
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const scrubRef = useRef(false);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [announce, setAnnounce] = useState("");

  const total = sb.frames.reduce((sum, f) => sum + f.duration, 0);

  const cardIds = sb.frames.map((f) => `frame-card-${f.id}`);

  const focusCard = (index: number): void => {
    const clamped = Math.max(0, Math.min(index, sb.frames.length - 1));
    const el = document.getElementById(cardIds[clamped]);
    el?.focus();
  };

  const selectIndex = (index: number, focus = false): void => {
    if (sb.frames.length === 0) return;
    const clamped = Math.max(0, Math.min(index, sb.frames.length - 1));
    const f = sb.frames[clamped];
    ed.select(f.id, null);
    setAnnounce(`Frame ${frameNumber(clamped)} of ${sb.frames.length}`);
    if (focus) focusCard(clamped);
  };

  const insertIndexFromPointer = (clientX: number): number => {
    const strip = stripRef.current;
    if (!strip) return sb.frames.length;
    const cards = [...strip.querySelectorAll<HTMLElement>("[data-frame-index]")];
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const idx = Number(card.dataset.frameIndex);
      if (clientX < rect.left + rect.width / 2) return idx;
    }
    return sb.frames.length;
  };

  const onCardPointerDown = (e: ReactPointerEvent<HTMLElement>, index: number): void => {
    if (e.button !== 0) return;
    dragRef.current = { fromIndex: index, pointerId: e.pointerId, insertAt: index, active: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onStripPointerMove = (e: ReactPointerEvent<HTMLElement>): void => {
    // reorder drag
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      if (!d.active) {
        const startEl = document.getElementById(cardIds[d.fromIndex]);
        const rect = startEl?.getBoundingClientRect();
        if (rect && Math.abs(e.clientX - (rect.left + rect.width / 2)) < 6 && e.pointerType === "touch") {
          return;
        }
        d.active = true;
        setDrag({ ...d });
      }
      const at = insertIndexFromPointer(e.clientX);
      if (at !== d.insertAt) {
        const next = { ...d, insertAt: at };
        dragRef.current = next;
        setDrag(next);
      }
      return;
    }
    // timeline scrubbing: drag across the strip to flip the stage
    if (e.buttons & 1 && scrubRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-frame-index]");
      if (el) {
        const idx = Number(el.dataset.frameIndex);
        if (idx !== frameIndex) selectIndex(idx);
      }
    }
  };

  const onStripPointerUp = (e: ReactPointerEvent<HTMLElement>): void => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      dragRef.current = null;
      setDrag(null);
      if (d.active) {
        const at = Math.max(0, Math.min(d.insertAt, sb.frames.length));
        const to = at > d.fromIndex ? at - 1 : at;
        if (to !== d.fromIndex) {
          ed.run("reorder-frame", (sbNow) => ops.moveFrame(sbNow, d.fromIndex, to).sb, { frameId: sb.frames[d.fromIndex].id });
          setAnnounce(`Frame ${d.fromIndex + 1} moved to position ${to + 1}`);
        }
      } else {
        selectIndex(d.fromIndex);
      }
      return;
    }
    scrubRef.current = false;
  };

  const onStripKeyDown = (e: ReactKeyboardEvent<HTMLElement>): void => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const delta = e.key === "ArrowRight" ? 1 : -1;
      if (e.altKey || e.ctrlKey || e.metaKey) {
        const to = Math.max(0, Math.min(frameIndex + delta, sb.frames.length - 1));
        if (to !== frameIndex) {
          ed.run("reorder-frame", (sbNow) => ops.moveFrame(sbNow, frameIndex, to).sb);
          setAnnounce(`Frame ${frameIndex + 1} moved to position ${to + 1}`);
          window.setTimeout(() => focusCard(to), 0);
        }
      } else {
        selectIndex(frameIndex + delta, true);
      }
    }
    if (e.key === "Home") {
      e.preventDefault();
      selectIndex(0, true);
    }
    if (e.key === "End") {
      e.preventDefault();
      selectIndex(sb.frames.length - 1, true);
    }
  };

  const addFrameAfter = (): void => {
    const f = newFrame({ background: frame?.background ?? "#f5f1e6" });
    ed.run("add-frame", (sbNow) => ops.insertFrameAfter(sbNow, frameIndex, f).sb, { frameId: f.id, objectId: null });
    setAnnounce(`Frame ${frameIndex + 2} added`);
    window.setTimeout(() => focusCard(frameIndex + 1), 0);
  };

  const duplicateCurrent = (): void => {
    if (!frame) return;
    ed.run("duplicate-frame", (sbNow) => ops.duplicateFrame(sbNow, frame.id));
    setAnnounce(`Frame duplicated`);
    window.setTimeout(() => focusCard(frameIndex + 1), 0);
  };

  const removeCurrent = (): void => {
    if (!frame || sb.frames.length <= 1) return;
    const nextIndex = Math.max(0, frameIndex - 1);
    ed.run("remove-frame", (sbNow) => ops.removeFrame(sbNow, frame.id).sb, { frameId: sb.frames[nextIndex]?.id });
    setAnnounce(`Frame ${frameIndex + 1} deleted`);
    window.setTimeout(() => focusCard(nextIndex), 0);
  };

  const moveCurrent = (delta: number): void => {
    const to = Math.max(0, Math.min(frameIndex + delta, sb.frames.length - 1));
    if (to === frameIndex) return;
    ed.run("reorder-frame", (sbNow) => ops.moveFrame(sbNow, frameIndex, to).sb);
    setAnnounce(`Frame ${frameIndex + 1} moved to position ${to + 1}`);
    window.setTimeout(() => focusCard(to), 0);
  };

  const markerBefore = drag?.active ? drag.insertAt : -1;

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="timeline-head">
        <span className="label">Timeline</span>
        <span className="total">
          {sb.frames.length} frames · {formatSeconds(total)} total
        </span>
        <span className="total hide-mobile">drag to reorder · arrow keys to step · ctrl+arrows to reorder</span>
      </div>
      <div
        className="frame-strip scroll-hover"
        ref={stripRef}
        role="toolbar"
        aria-label="Frames"
        aria-orientation="horizontal"
        tabIndex={-1}
        onKeyDown={onStripKeyDown}
        onPointerDown={(e) => {
          if (!(e.target as Element).closest("[data-frame-index]")) scrubRef.current = true;
        }}
        onPointerMove={onStripPointerMove}
        onPointerUp={onStripPointerUp}
        onPointerCancel={onStripPointerUp}
      >
        {sb.frames.map((f, i) => {
          const isCurrent = f.id === frame?.id;
          const card = (
            <div
              key={f.id}
              id={cardIds[i]}
              data-frame-index={i}
              className="frame-card"
              data-current={isCurrent}
              data-dragging={drag?.active && drag.fromIndex === i}
            >
              <button
                type="button"
                className="card-art"
                tabIndex={isCurrent ? 0 : -1}
                aria-label={`Frame ${i + 1} of ${sb.frames.length}${f.shot ? `, ${f.shot}` : ""}, holds ${f.duration.toFixed(1)} seconds${isCurrent ? ", current" : ""}`}
                onPointerDown={(e) => onCardPointerDown(e, i)}
                onClick={() => selectIndex(i)}
              >
                <FrameArtView frame={f} aspect={sb.aspect} resolve={resolve} />
              </button>
              <div className="card-meta">
                <span className="card-num">{frameNumber(i)}</span>
                {f.shot && <span>{f.shot}</span>}
                <span style={{ marginLeft: "auto" }}>{f.duration.toFixed(1)}s</span>
              </div>
              {isCurrent && (
                <div className="card-actions">
                  <button type="button" className="icon-btn" aria-label={`Move frame ${i + 1} earlier`} disabled={i === 0} onClick={() => moveCurrent(-1)}>
                    <Icon name="move-left" size={13} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Move frame ${i + 1} later`} disabled={i === sb.frames.length - 1} onClick={() => moveCurrent(1)}>
                    <Icon name="move-right" size={13} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Duplicate frame ${i + 1}`} onClick={duplicateCurrent}>
                    <Icon name="copy" size={13} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Delete frame ${i + 1}`} disabled={sb.frames.length <= 1} onClick={removeCurrent}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              )}
            </div>
          );
          return (
            <div key={`wrap-${f.id}`} style={{ display: "contents" }}>
              {markerBefore === i && <div className="insert-marker" aria-hidden="true" />}
              {card}
            </div>
          );
        })}
        {markerBefore === sb.frames.length && <div className="insert-marker" aria-hidden="true" />}
        <button type="button" className="add-frame" onClick={addFrameAfter} aria-label="Add a frame at the end">
          <Icon name="plus" />
          Frame
        </button>
      </div>
      <LiveStatus message={announce} />
    </section>
  );
}
