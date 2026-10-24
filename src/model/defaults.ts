import { newId } from "./ids";
import { clamp, clampBox, frameHeightUnits } from "./geometry";
import { FRAME_BG_SWATCHES } from "./palette";
import type {
  AspectRatio,
  Frame,
  FrameObject,
  ImageObject,
  ShapeObject,
  Storyboard,
  TextObject,
} from "./types";

export const TITLE_MAX = 120;
export const BRIEF_MAX = 600;
export const NOTES_MAX = 2000;
export const CAPTION_MAX = 300;
export const TEXT_MAX = 800;
export const MAX_FRAMES = 200;
export const MAX_OBJECTS_PER_FRAME = 60;
export const DURATION_MIN = 0.5;
export const DURATION_MAX = 30;

export function newFrame(patch: Partial<Frame> = {}): Frame {
  return {
    id: newId(),
    background: FRAME_BG_SWATCHES[0],
    objects: [],
    caption: { text: "", visible: true },
    notes: "",
    shot: "",
    duration: 2.5,
    transitionIn: "cut",
    guides: false,
    ...patch,
  };
}

export function newStoryboard(patch: Partial<Storyboard> = {}): Storyboard {
  const now = Date.now();
  return {
    schemaVersion: 1,
    id: newId(),
    title: "Untitled board",
    aspect: "16:9",
    paper: "#efe9db",
    brief: "",
    author: "",
    frames: [newFrame()],
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

export function newImageObject(assetId: string, patch: Partial<ImageObject> = {}): ImageObject {
  return {
    id: newId(),
    kind: "image",
    x: 200,
    y: 150,
    w: 600,
    h: 260,
    opacity: 1,
    assetId,
    fit: "cover",
    borderWidth: 0,
    borderColor: "#201d18",
    cornerRadius: 0,
    ...patch,
  };
}

export function newShapeObject(patch: Partial<ShapeObject> = {}): ShapeObject {
  return {
    id: newId(),
    kind: "shape",
    shape: "rect",
    x: 320,
    y: 240,
    w: 360,
    h: 220,
    opacity: 1,
    fill: "#d7f04c",
    strokeColor: "#201d18",
    strokeWidth: 0,
    cornerRadius: 0,
    ...patch,
  };
}

export function newTextObject(patch: Partial<TextObject> = {}): TextObject {
  return {
    id: newId(),
    kind: "text",
    x: 100,
    y: 100,
    w: 800,
    h: 90,
    opacity: 1,
    text: "Headline",
    font: "grotesk",
    size: 64,
    weight: 600,
    align: "left",
    color: "#201d18",
    lineHeight: 1.1,
    letterSpacing: 0,
    ...patch,
  };
}

/** Clamp an object box into a frame of the given aspect. Pure. */
export function fitObjectToFrame(obj: FrameObject, aspect: AspectRatio): FrameObject {
  const height = frameHeightUnits(aspect);
  const minH = obj.kind === "shape" && obj.shape === "line" ? 0 : 1;
  const box = clampBox(obj, height, 1, minH);
  return { ...obj, ...box };
}

/** Grow the frame if needed so nothing is lost after an aspect change. */
export function relayoutForAspect(frame: Frame, aspect: AspectRatio): Frame {
  return { ...frame, objects: frame.objects.map((o) => fitObjectToFrame(o, aspect)) };
}

export function clampDuration(d: number): number {
  return clamp(Number.isFinite(d) ? d : DURATION_MIN, DURATION_MIN, DURATION_MAX);
}
