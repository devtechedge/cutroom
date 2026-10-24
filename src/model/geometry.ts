import type { AspectRatio } from "./types";

export const FRAME_UNITS = 1000;

export const ASPECT_VALUE: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
};

/** Frame height in width-anchored normalized units. */
export function frameHeightUnits(aspect: AspectRatio): number {
  return FRAME_UNITS / ASPECT_VALUE[aspect];
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clampUnit(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

/** Keep an object's box inside 0..FRAME_UNITS x 0..height, shrinking if needed. */
export function clampBox(
  box: { x: number; y: number; w: number; h: number },
  height: number,
  minW = 1,
  minH = 1,
): { x: number; y: number; w: number; h: number } {
  const w = clamp(box.w, minW, FRAME_UNITS);
  const h = clamp(box.h, minH, height);
  const x = clamp(box.x, 0, FRAME_UNITS - w);
  const y = clamp(box.y, 0, height - h);
  return { x, y, w, h };
}

export function aspectLabel(a: AspectRatio): string {
  return a;
}

/** Fit a frame of `aspect` into a box, returning the centered rect. */
export function fitRect(
  aspect: AspectRatio,
  boxW: number,
  boxH: number,
): { width: number; height: number; x: number; y: number } {
  const ratio = ASPECT_VALUE[aspect];
  let width = boxW;
  let height = width / ratio;
  if (height > boxH) {
    height = boxH;
    width = height * ratio;
  }
  return { width, height, x: (boxW - width) / 2, y: (boxH - height) / 2 };
}

export function formatSeconds(s: number): string {
  return `${clamp(s, 0.1, 99).toFixed(1)}s`;
}

/** "03" style frame ordinal used across strip, stage, and exports. */
export function frameNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}
