/* The stage surface is the editor's keyboard drawing surface (arrows nudge,
   Delete removes, Escape deselects via onStageKeyDown). The jsx-a11y plugin
   cannot see that keyboard support on a role="group" div, so these two rules
   are relaxed for this file only. */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { useLayoutEffect, useRef, useState, type JSX, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useEditor } from "../state/editor";
import * as ops from "../model/ops";
import { frameHeightUnits, frameNumber } from "../model/geometry";
import type { FrameObject } from "../model/types";
import type { AssetResolver } from "../render/primitives";
import { FrameArtView } from "./FrameView";
import { Icon } from "./Icon";

const UNIT_MIN = 24;
const MOVE_STEP = 5;
const MOVE_STEP_FINE = 1;

interface DragState {
  mode: "move" | "resize";
  handle?: "nw" | "ne" | "sw" | "se";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  original: { x: number; y: number; w: number; h: number };
  objectId: string;
  isLine: boolean;
  scale: number;
}

export interface StageProps {
  resolve: AssetResolver;
  zoom: number;
}

export function Stage({ resolve, zoom }: StageProps): JSX.Element {
  const ed = useEditor();
  const { sb, frame, object } = ed;
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [fitWidth, setFitWidth] = useState(720);

  const height = frame ? frameHeightUnits(sb.aspect) : 0;
  const ratio = height > 0 ? 1000 / height : 16 / 9;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = (): void => {
      const pad = window.innerWidth < 768 ? 14 : 28;
      const fitW = Math.min(el.clientWidth - pad * 2, (el.clientHeight - pad * 2) * ratio);
      setFitWidth(Math.max(220, Math.floor(fitW)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  const displayWidth = Math.max(160, Math.round(fitWidth * zoom));
  const scale = displayWidth / 1000;

  if (!frame) {
    return <div className="stage-scroll" ref={scrollRef} />;
  }

  const beginDrag = (e: ReactPointerEvent<HTMLElement>, obj: FrameObject, mode: DragState["mode"], handle?: DragState["handle"]): void => {
    e.preventDefault();
    e.stopPropagation();
    ed.select(frame.id, obj.id);
    dragRef.current = {
      mode,
      handle,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      original: { x: obj.x, y: obj.y, w: obj.w, h: obj.h },
      objectId: obj.id,
      isLine: obj.kind === "shape" && obj.shape === "line",
      scale,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = (e.clientX - drag.startClientX) / drag.scale;
    const dy = (e.clientY - drag.startClientY) / drag.scale;
    const o = drag.original;
    let next: { x: number; y: number; w: number; h: number };
    if (drag.mode === "move") {
      next = { x: o.x + dx, y: o.y + dy, w: o.w, h: o.h };
    } else if (drag.handle === "se") {
      next = { x: o.x, y: o.y, w: Math.max(UNIT_MIN, o.w + dx), h: Math.max(drag.isLine ? 0 : UNIT_MIN, o.h + dy) };
    } else if (drag.handle === "nw") {
      next = { x: o.x + dx, y: o.y + dy, w: Math.max(UNIT_MIN, o.w - dx), h: Math.max(drag.isLine ? 0 : UNIT_MIN, o.h - dy) };
    } else if (drag.handle === "ne") {
      next = { x: o.x, y: o.y + dy, w: Math.max(UNIT_MIN, o.w + dx), h: Math.max(drag.isLine ? 0 : UNIT_MIN, o.h - dy) };
    } else {
      next = { x: o.x + dx, y: o.y, w: Math.max(UNIT_MIN, o.w - dx), h: Math.max(drag.isLine ? 0 : UNIT_MIN, o.h + dy) };
    }
    ed.run("transform-object", (sbNow) => ops.updateObject(sbNow, frame.id, drag.objectId, next));
  };

  const endDrag = (e: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag && e.pointerId === drag.pointerId) dragRef.current = null;
  };

  const cancelDrag = (): void => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    ed.run("transform-object", (sbNow) => ops.updateObject(sbNow, frame.id, drag.objectId, drag.original));
  };

  const onStageKeyDown = (e: ReactKeyboardEvent<HTMLElement>): void => {
    if (e.key === "Escape") {
      ed.select(frame.id, null);
      return;
    }
    const obj = object;
    if (!obj) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      ed.run("remove-object", (sb2) => ops.removeObject(sb2, frame.id, obj.id), { objectId: null });
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = e.shiftKey ? MOVE_STEP_FINE : MOVE_STEP;
      const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
      const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
      ed.run("nudge-object", (sb2) => ops.updateObject(sb2, frame.id, obj.id, { x: obj.x + dx, y: obj.y + dy }));
    }
  };

  const missingImage = frame.objects.some((o) => o.kind === "image" && !resolve((o).assetId));

  return (
    <div className="stage-scroll scroll-hover" ref={scrollRef}>
      <div className="stage-art-stack" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={cancelDrag}>
        <div
          className="stage-frame-box"
          style={{ width: displayWidth, height: Math.round(displayWidth / ratio) }}
          role="group"
          aria-label={`Stage: frame ${frameNumber(ed.frameIndex)} of ${sb.frames.length}`}
          tabIndex={0}
          onKeyDown={onStageKeyDown}
          onPointerDown={(e) => {
            if (!(e.target as Element).closest(".stage-object-hit")) ed.select(frame.id, null);
          }}
        >
          <FrameArtView frame={frame} aspect={sb.aspect} resolve={resolve} title={`Frame ${frameNumber(ed.frameIndex)} artwork`} />
          {frame.guides && (
            <div className="stage-guides" aria-hidden="true">
              <div className="third" style={{ left: "33.33%", top: 0, width: 1, height: "100%" }} />
              <div className="third" style={{ left: "66.66%", top: 0, width: 1, height: "100%" }} />
              <div className="third" style={{ top: "33.33%", left: 0, height: 1, width: "100%" }} />
              <div className="third" style={{ top: "66.66%", left: 0, height: 1, width: "100%" }} />
              <div className="safe" />
            </div>
          )}
          {frame.objects.map((obj) => {
            const selected = object?.id === obj.id;
            const label =
              obj.kind === "text"
                ? `Text: ${obj.text.split("\n")[0].slice(0, 30)}`
                : obj.kind === "image"
                  ? "Image"
                  : `${obj.shape} shape`;
            return (
              <div
                key={obj.id}
                className="stage-object-hit"
                data-selected={selected}
                role="button"
                tabIndex={0}
                aria-label={`${label}${selected ? " (selected)" : ""}`}
                aria-pressed={selected}
                style={{ left: obj.x * scale, top: obj.y * scale, width: obj.w * scale, height: Math.max(obj.h * scale, 3) }}
                onPointerDown={(e) => beginDrag(e, obj, "move")}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !selected) {
                    e.preventDefault();
                    ed.select(frame.id, obj.id);
                  }
                }}
              >
                {selected && (
                  <>
                    <span className="handle nw" onPointerDown={(e) => beginDrag(e, obj, "resize", "nw")} aria-hidden="true" />
                    <span className="handle ne" onPointerDown={(e) => beginDrag(e, obj, "resize", "ne")} aria-hidden="true" />
                    <span className="handle sw" onPointerDown={(e) => beginDrag(e, obj, "resize", "sw")} aria-hidden="true" />
                    <span className="handle se" onPointerDown={(e) => beginDrag(e, obj, "resize", "se")} aria-hidden="true" />
                  </>
                )}
              </div>
            );
          })}
          <div className="stage-hud">
            <span className="hud-chip mono">{frameNumber(ed.frameIndex)}</span>
            {frame.shot && <span className="hud-chip mono">{frame.shot}</span>}
            {missingImage && (
              <span className="hud-chip mono missing" role="status">
                <Icon name="warning" size={11} /> missing image
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
