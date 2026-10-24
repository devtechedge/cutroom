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
const MARQUEE_THRESHOLD = 4;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DragState {
  mode: "move" | "resize";
  handle?: "nw" | "ne" | "sw" | "se";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originals: Map<string, Box>;
  objectId: string;
  ids: string[];
  isLine: boolean;
  scale: number;
}

interface MarqueeState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
}

export interface StageProps {
  resolve: AssetResolver;
  zoom: number;
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function Stage({ resolve, zoom }: StageProps): JSX.Element {
  const ed = useEditor();
  const { sb, frame, objects, objectIds } = ed;
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const [fitWidth, setFitWidth] = useState(720);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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
    if (e.shiftKey) {
      ed.select(frame.id, obj.id, true);
      return;
    }
    let ids = ed.objectIds;
    if (!ids.includes(obj.id)) {
      ed.select(frame.id, obj.id);
      ids = [obj.id];
    }
    const originals = new Map<string, Box>();
    for (const id of ids) {
      const found = frame.objects.find((o) => o.id === id);
      if (found) originals.set(id, { x: found.x, y: found.y, w: found.w, h: found.h });
    }
    dragRef.current = {
      mode,
      handle,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originals,
      objectId: obj.id,
      ids,
      isLine: obj.kind === "shape" && obj.shape === "line",
      scale,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer may already be gone (synthetic events, fast taps); the move
      // listeners on the stage stack keep the drag working either way
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>): void => {
    const box = marqueeRef.current;
    if (box && e.pointerId === box.pointerId) {
      const rect = frameBoxRef.current?.getBoundingClientRect();
      if (!rect) return;
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      box.currentX = currentX;
      box.currentY = currentY;
      setMarquee({
        x: Math.min(box.startX, currentX),
        y: Math.min(box.startY, currentY),
        w: Math.abs(currentX - box.startX),
        h: Math.abs(currentY - box.startY),
      });
      return;
    }
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = (e.clientX - drag.startClientX) / drag.scale;
    const dy = (e.clientY - drag.startClientY) / drag.scale;
    if (drag.mode === "move") {
      const patches: Record<string, Partial<FrameObject>> = {};
      for (const [id, o] of drag.originals) patches[id] = { x: o.x + dx, y: o.y + dy };
      ed.run("transform-object", (sbNow) => ops.updateObjects(sbNow, frame.id, patches));
      return;
    }
    const o = drag.originals.get(drag.objectId);
    if (!o) return;
    let next: Box;
    if (drag.handle === "se") {
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

  const finishMarquee = (e: ReactPointerEvent<HTMLElement>): void => {
    const box = marqueeRef.current;
    if (!box || e.pointerId !== box.pointerId) return;
    marqueeRef.current = null;
    setMarquee(null);
    const rect = frameBoxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x1 = Math.min(box.startX, box.currentX);
    const y1 = Math.min(box.startY, box.currentY);
    const x2 = Math.max(box.startX, box.currentX);
    const y2 = Math.max(box.startY, box.currentY);
    if (x2 - x1 < MARQUEE_THRESHOLD && y2 - y1 < MARQUEE_THRESHOLD) {
      if (!box.additive) ed.clearSelection();
      return;
    }
    const area = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    const hits = frame.objects
      .filter((o) => intersects(area, { x: o.x * scale, y: o.y * scale, w: Math.max(o.w * scale, 3), h: Math.max(o.h * scale, 3) }))
      .map((o) => o.id);
    const ids = box.additive ? [...new Set([...ed.objectIds, ...hits])] : hits;
    ed.selectMany(ids);
    frameBoxRef.current?.focus();
  };

  const endDrag = (e: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag && e.pointerId === drag.pointerId) dragRef.current = null;
    finishMarquee(e);
  };

  const cancelDrag = (): void => {
    const box = marqueeRef.current;
    if (box) {
      marqueeRef.current = null;
      setMarquee(null);
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const patches: Record<string, Partial<FrameObject>> = {};
    for (const [id, o] of drag.originals) patches[id] = o;
    ed.run("transform-object", (sbNow) => ops.updateObjects(sbNow, frame.id, patches));
  };

  const onStageKeyDown = (e: ReactKeyboardEvent<HTMLElement>): void => {
    if (e.key === "Escape") {
      ed.clearSelection();
      return;
    }
    if (objectIds.length === 0) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      ed.run("remove-object", (sb2) => ops.removeObjects(sb2, frame.id, objectIds), { objectIds: [] });
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = e.shiftKey ? MOVE_STEP_FINE : MOVE_STEP;
      const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
      const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
      const patches: Record<string, Partial<FrameObject>> = {};
      for (const o of objects) patches[o.id] = { x: o.x + dx, y: o.y + dy };
      ed.run("nudge-object", (sb2) => ops.updateObjects(sb2, frame.id, patches));
    }
  };

  const duplicateSelection = (): void => {
    const copies = ops.cloneObjects(objects);
    if (copies.length === 0) return;
    ed.run("duplicate-objects", (sb2) => ops.addObjects(sb2, frame.id, copies), { objectIds: copies.map((o) => o.id) });
  };

  const removeSelection = (): void => {
    ed.run("remove-objects", (sb2) => ops.removeObjects(sb2, frame.id, objectIds), { objectIds: [] });
  };

  const missingImage = frame.objects.some((o) => o.kind === "image" && !resolve((o).assetId));

  return (
    <div className="stage-scroll scroll-hover" ref={scrollRef}>
      <div className="stage-art-stack" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={cancelDrag}>
        <div
          ref={frameBoxRef}
          className="stage-frame-box"
          style={{ width: displayWidth, height: Math.round(displayWidth / ratio) }}
          role="group"
          aria-label={`Stage: frame ${frameNumber(ed.frameIndex)} of ${sb.frames.length}`}
          tabIndex={0}
          onKeyDown={onStageKeyDown}
          onPointerDown={(e) => {
            if ((e.target as Element).closest(".stage-object-hit")) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const startX = e.clientX - rect.left;
            const startY = e.clientY - rect.top;
            marqueeRef.current = {
              pointerId: e.pointerId,
              startClientX: e.clientX,
              startClientY: e.clientY,
              startX,
              startY,
              currentX: startX,
              currentY: startY,
              additive: e.shiftKey,
            };
            setMarquee({ x: startX, y: startY, w: 0, h: 0 });
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // capture is a convenience; the stack handlers still receive the pointer
            }
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
            const selected = objectIds.includes(obj.id);
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
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (e.shiftKey) ed.select(frame.id, obj.id, true);
                    else if (!selected) ed.select(frame.id, obj.id);
                  }
                }}
              >
                {selected && objectIds.length === 1 && (
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
          {marquee && marquee.w + marquee.h > 0 && (
            <div className="stage-marquee" aria-hidden="true" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />
          )}
          <div className="stage-hud">
            <span className="hud-chip mono">{frameNumber(ed.frameIndex)}</span>
            {frame.shot && <span className="hud-chip mono">{frame.shot}</span>}
            {objectIds.length > 1 && (
              <span className="hud-chip mono selection-chip" role="status">
                {objectIds.length} selected
              </span>
            )}
            {missingImage && (
              <span className="hud-chip mono missing" role="status">
                <Icon name="warning" size={11} /> missing image
              </span>
            )}
          </div>
        </div>
        {objectIds.length > 1 && (
          <div className="stage-selection-bar" role="toolbar" aria-label="Selection actions">
            <span className="mono">{objectIds.length} objects selected</span>
            <button type="button" className="btn small" onClick={duplicateSelection}>
              Duplicate
            </button>
            <button type="button" className="btn small danger" onClick={removeSelection}>
              <Icon name="trash" size={13} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
