import { newShapeObject, newTextObject } from "./defaults";
import { newId } from "./ids";
import type { FrameObject, ShapeObject, TextObject } from "./types";

type SP = Partial<ShapeObject>;
type TP = Partial<TextObject>;

const INK = "#201d18";
const PAPER = "#f5f1e6";
const LIME = "#d7f04c";

function rect(p: SP): FrameObject {
  return newShapeObject({ shape: "rect", ...p });
}
function ell(p: SP): FrameObject {
  return newShapeObject({ shape: "ellipse", ...p });
}
function tri(p: SP): FrameObject {
  return newShapeObject({ shape: "triangle", ...p });
}
function line(p: SP): FrameObject {
  return newShapeObject({ shape: "line", strokeWidth: 6, strokeColor: INK, ...p });
}
function txt(p: TP): FrameObject {
  return newTextObject({ color: INK, ...p });
}

/** Insertable vector presets. Coordinates are width-normalized (0..1000). */
export interface ArtworkPreset {
  id: string;
  label: string;
  build: () => FrameObject[];
}

export const ARTWORK_PRESETS: readonly ArtworkPreset[] = [
  {
    id: "horizon",
    label: "Horizon",
    build: () => [
      ell({ x: 660, y: 90, w: 140, h: 140, fill: LIME, strokeWidth: 0 }),
      tri({ x: 40, y: 300, w: 300, h: 180, fill: "#31402a", strokeWidth: 0 }),
      tri({ x: 240, y: 330, w: 360, h: 150, fill: "#4a5a38", strokeWidth: 0 }),
      rect({ x: 0, y: 460, w: 1000, h: 30, fill: INK, strokeWidth: 0 }),
    ],
  },
  {
    id: "figure",
    label: "Figure",
    build: () => [
      ell({ x: 455, y: 130, w: 90, h: 90, fill: "none", strokeColor: INK, strokeWidth: 10 }),
      line({ x: 500, y: 230, w: 0, h: 180, strokeWidth: 12 }),
      line({ x: 500, y: 280, w: -110, h: 90, strokeWidth: 10 }),
      line({ x: 500, y: 280, w: 110, h: 90, strokeWidth: 10 }),
      line({ x: 500, y: 410, w: -70, h: 130, strokeWidth: 10 }),
      line({ x: 500, y: 410, w: 70, h: 130, strokeWidth: 10 }),
    ],
  },
  {
    id: "speech",
    label: "Speech",
    build: () => [
      newShapeObject({ shape: "rect", x: 180, y: 150, w: 640, h: 220, fill: PAPER, strokeColor: INK, strokeWidth: 8, cornerRadius: 24 }),
      tri({ x: 320, y: 368, w: 90, h: 70, fill: PAPER, strokeColor: INK, strokeWidth: 8 }),
      rect({ x: 240, y: 205, w: 520, h: 18, fill: "#b8b09a", strokeWidth: 0 }),
      rect({ x: 240, y: 250, w: 460, h: 18, fill: "#b8b09a", strokeWidth: 0 }),
      rect({ x: 240, y: 295, w: 340, h: 18, fill: "#b8b09a", strokeWidth: 0 }),
    ],
  },
  {
    id: "arrow-right",
    label: "Arrow",
    build: () => [line({ x: 200, y: 280, w: 520, h: 0, strokeWidth: 16 }), tri({ x: 720, y: 230, w: 120, h: 100, fill: INK, strokeWidth: 0 })],
  },
  {
    id: "window",
    label: "Window",
    build: () => [
      newShapeObject({ shape: "rect", x: 240, y: 110, w: 520, h: 380, fill: "none", strokeColor: INK, strokeWidth: 12 }),
      line({ x: 500, y: 110, w: 0, h: 380, strokeWidth: 8 }),
      line({ x: 240, y: 300, w: 520, h: 0, strokeWidth: 8 }),
      line({ x: 200, y: 494, w: 600, h: 0, strokeWidth: 14 }),
    ],
  },
  {
    id: "car",
    label: "Car",
    build: () => [
      newShapeObject({ shape: "rect", x: 220, y: 280, w: 560, h: 120, fill: "#3a3f52", strokeWidth: 0, cornerRadius: 28 }),
      newShapeObject({ shape: "rect", x: 330, y: 200, w: 250, h: 100, fill: "#3a3f52", strokeWidth: 0, cornerRadius: 20 }),
      ell({ x: 300, y: 380, w: 90, h: 90, fill: INK, strokeWidth: 0 }),
      ell({ x: 610, y: 380, w: 90, h: 90, fill: INK, strokeWidth: 0 }),
      ell({ x: 322, y: 402, w: 46, h: 46, fill: "#8d8672", strokeWidth: 0 }),
      ell({ x: 632, y: 402, w: 46, h: 46, fill: "#8d8672", strokeWidth: 0 }),
    ],
  },
  {
    id: "tree",
    label: "Tree",
    build: () => [rect({ x: 470, y: 320, w: 60, h: 180, fill: "#4a453c", strokeWidth: 0 }), ell({ x: 330, y: 140, w: 340, h: 240, fill: "#4a5a38", strokeWidth: 0 })],
  },
  {
    id: "title",
    label: "Title card",
    build: () => [
      txt({ text: "TITLE", x: 100, y: 210, w: 800, size: 110, weight: 700, align: "center", letterSpacing: 0.02 }),
      txt({ text: "a subtitle line", x: 100, y: 350, w: 800, size: 30, weight: 400, align: "center", font: "mono", color: "#4a453c" }),
      line({ x: 430, y: 330, w: 140, h: 0, strokeWidth: 6, strokeColor: "#4a453c" }),
    ],
  },
];

export function presetById(id: string): ArtworkPreset | undefined {
  return ARTWORK_PRESETS.find((p) => p.id === id);
}

/** Fresh, id-stamped objects for inserting a preset into a frame. */
export function instantiatePreset(id: string): FrameObject[] {
  const preset = presetById(id);
  if (!preset) return [];
  return preset.build().map((o) => ({ ...o, id: newId() }));
}
