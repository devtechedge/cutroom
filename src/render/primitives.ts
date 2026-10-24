import { ASPECT_VALUE, FRAME_UNITS } from "../model/geometry";
import { FONT_STACKS } from "./fonts";
import type { Frame, ImageObject, ShapeObject, TextObject } from "../model/types";

export interface ResolvedImage {
  dataUrl: string;
  width: number;
  height: number;
}

export type AssetResolver = (assetId: string) => ResolvedImage | undefined;

export type Primitive =
  | {
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      radius: number;
      fill: string | null;
      stroke: string | null;
      strokeWidth: number;
      opacity: number;
    }
  | {
      type: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: string | null;
      stroke: string | null;
      strokeWidth: number;
      opacity: number;
    }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; opacity: number }
  | {
      type: "triangle";
      x: number;
      y: number;
      w: number;
      h: number;
      fill: string | null;
      stroke: string | null;
      strokeWidth: number;
      opacity: number;
    }
  | {
      type: "image";
      href: string;
      /** Placed image rect (already cover/contain resolved). */
      x: number;
      y: number;
      w: number;
      h: number;
      /** Object box to clip against (cover overflow lives here). */
      clipX: number;
      clipY: number;
      clipW: number;
      clipH: number;
      radius: number;
      borderWidth: number;
      borderColor: string;
      opacity: number;
    }
  | {
      type: "text";
      lines: string[];
      x: number;
      y: number;
      boxW: number;
      fontSize: number;
      fontWeight: number;
      fontFamily: string;
      align: "left" | "center" | "right";
      color: string;
      lineHeight: number;
      letterSpacing: number;
      opacity: number;
    }
  | { type: "placeholder"; x: number; y: number; w: number; h: number; label: string; opacity: number };

export interface FrameArt {
  width: number;
  height: number;
  background: string;
  primitives: Primitive[];
  /** True when at least one image object could not be resolved. */
  hasMissing: boolean;
}

export function frameAspectValue(aspect: string): number {
  const known = ASPECT_VALUE as Record<string, number | undefined>;
  return known[aspect] ?? 16 / 9;
}

function shapeToPrimitives(o: ShapeObject, s: number, height: number): Primitive[] {
  const x = o.x * s;
  const y = o.y * s;
  const w = o.w * s;
  const h = o.h * s;
  const fill = o.fill === "none" ? null : o.fill;
  if (o.shape === "rect") {
    return [
      {
        type: "rect",
        x,
        y,
        w,
        h,
        radius: o.cornerRadius * s,
        fill,
        stroke: o.strokeWidth > 0 ? o.strokeColor : null,
        strokeWidth: o.strokeWidth * s,
        opacity: o.opacity,
      },
    ];
  }
  if (o.shape === "ellipse") {
    return [
      {
        type: "ellipse",
        cx: x + w / 2,
        cy: y + h / 2,
        rx: Math.max(w / 2, 0.5),
        ry: Math.max(h / 2, 0.5),
        fill,
        stroke: o.strokeWidth > 0 ? o.strokeColor : null,
        strokeWidth: o.strokeWidth * s,
        opacity: o.opacity,
      },
    ];
  }
  if (o.shape === "triangle") {
    return [
      {
        type: "triangle",
        x,
        y,
        w,
        h,
        fill,
        stroke: o.strokeWidth > 0 ? o.strokeColor : null,
        strokeWidth: o.strokeWidth * s,
        opacity: o.opacity,
      },
    ];
  }
  return [
    {
      type: "line",
      x1: x,
      y1: Math.min(y, height),
      x2: x + w,
      y2: Math.min(y + h, height),
      stroke: o.strokeWidth > 0 ? o.strokeColor : o.fill,
      strokeWidth: Math.max(o.strokeWidth * s, 1),
      opacity: o.opacity,
    },
  ];
}

/** Cover/contain placement of a source image inside a destination box. */
export function imagePlacement(
  fit: ImageObject["fit"],
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { x: number; y: number; w: number; h: number } {
  if (srcW <= 0 || srcH <= 0) return { x: 0, y: 0, w: dstW, h: dstH };
  const scale = fit === "cover" ? Math.max(dstW / srcW, dstH / srcH) : Math.min(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (dstW - w) / 2, y: (dstH - h) / 2, w, h };
}

function imageToPrimitives(o: ImageObject, s: number, resolve: AssetResolver): { prims: Primitive[]; missing: boolean } {
  const box = { x: o.x * s, y: o.y * s, w: o.w * s, h: o.h * s };
  const asset = resolve(o.assetId);
  if (!asset) {
    return {
      prims: [
        {
          type: "placeholder",
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          label: "Image missing",
          opacity: o.opacity,
        },
      ],
      missing: true,
    };
  }
  const p = imagePlacement(o.fit, asset.width, asset.height, box.w, box.h);
  return {
    prims: [
      {
        type: "image",
        href: asset.dataUrl,
        x: box.x + p.x,
        y: box.y + p.y,
        w: p.w,
        h: p.h,
        clipX: box.x,
        clipY: box.y,
        clipW: box.w,
        clipH: box.h,
        radius: o.cornerRadius * s,
        borderWidth: o.borderWidth * s,
        borderColor: o.borderColor,
        opacity: o.opacity,
      },
    ],
    missing: false,
  };
}

function textToPrimitives(o: TextObject, s: number): Primitive[] {
  const lines = o.text.length === 0 ? [" "] : o.text.split("\n");
  return [
    {
      type: "text",
      lines,
      x: o.x * s,
      y: o.y * s,
      boxW: o.w * s,
      fontSize: o.size * s,
      fontWeight: o.weight,
      fontFamily: FONT_STACKS[o.font],
      align: o.align,
      color: o.color,
      lineHeight: o.lineHeight,
      letterSpacing: o.letterSpacing * o.size * s,
      opacity: o.opacity,
    },
  ];
}

/**
 * The single visual truth for a frame: background plus object primitives in
 * pixel space. The React stage, thumbnails, preview, PNG and SVG exports all
 * consume this, so they cannot drift apart.
 */
export function renderFrameArt(frame: Frame, aspect: string, width: number, resolve: AssetResolver): FrameArt {
  const ratio = frameAspectValue(aspect);
  const s = width / FRAME_UNITS;
  const height = width / ratio;
  const primitives: Primitive[] = [];
  let hasMissing = false;
  for (const obj of frame.objects) {
    if (obj.kind === "shape") {
      primitives.push(...shapeToPrimitives(obj, s, height));
    } else if (obj.kind === "text") {
      primitives.push(...textToPrimitives(obj, s));
    } else {
      const { prims, missing } = imageToPrimitives(obj, s, resolve);
      primitives.push(...prims);
      hasMissing = hasMissing || missing;
    }
  }
  return { width, height, background: frame.background, primitives, hasMissing };
}
