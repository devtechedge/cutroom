/**
 * CUTROOM project model.
 *
 * All geometry lives in a normalized coordinate space anchored to the frame
 * WIDTH: x, y, w, h are per-mille (0..1000) of the frame's width on both axes.
 * A 16:9 frame is therefore 1000 wide and 562.5 units tall. Anchoring both
 * axes to width means an aspect-ratio change rescales vertical space while
 * horizontal composition (and every object's size in width-units) is kept.
 */

export const SCHEMA_VERSION = 1;

export type AspectRatio = "16:9" | "4:3" | "1:1" | "9:16";

export const ASPECT_RATIOS: readonly AspectRatio[] = ["16:9", "4:3", "1:1", "9:16"];

export type ShotType =
  | "WIDE"
  | "MEDIUM"
  | "CLOSE"
  | "INSERT"
  | "OTS"
  | "POV"
  | "AERIAL"
  | "MACRO";

export const SHOT_TYPES: readonly ShotType[] = [
  "WIDE",
  "MEDIUM",
  "CLOSE",
  "INSERT",
  "OTS",
  "POV",
  "AERIAL",
  "MACRO",
];

/** Transition played when cutting INTO a frame during preview. */
export type Transition = "cut" | "dissolve" | "slide";

export const TRANSITIONS: readonly Transition[] = ["cut", "dissolve", "slide"];

export type FontChoice = "grotesk" | "serif" | "mono";

export type TextAlign = "left" | "center" | "right";

interface ObjectBase {
  id: string;
  /** Per-mille of frame width, both axes. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1 */
  opacity: number;
}

export interface ImageObject extends ObjectBase {
  kind: "image";
  assetId: string;
  fit: "contain" | "cover";
  borderWidth: number;
  borderColor: string;
  cornerRadius: number;
}

export interface ShapeObject extends ObjectBase {
  kind: "shape";
  shape: "rect" | "ellipse" | "line" | "triangle";
  fill: string;
  strokeColor: string;
  strokeWidth: number;
  /** rect only; 0..48 per-mille of width */
  cornerRadius: number;
}

export interface TextObject extends ObjectBase {
  kind: "text";
  /** Explicit lines only (no auto-wrap); split on \n. */
  text: string;
  font: FontChoice;
  /** Per-mille of frame width, 8..220. */
  size: number;
  /** 300..800. */
  weight: number;
  align: TextAlign;
  color: string;
  /** 0.9..2.0 em. */
  lineHeight: number;
  /** -0.04..0.4 em. */
  letterSpacing: number;
}

export type FrameObject = ImageObject | ShapeObject | TextObject;

export type ObjectKind = FrameObject["kind"];

export interface Caption {
  text: string;
  visible: boolean;
}

export interface Frame {
  id: string;
  background: string;
  objects: FrameObject[];
  caption: Caption;
  /** Production notes. Editor-facing; never rendered onto the frame art. */
  notes: string;
  shot: ShotType | "";
  /** Seconds this frame holds during preview. 0.5..30. */
  duration: number;
  transitionIn: Transition;
  /** Rule-of-thirds + safe-area overlay. Editor-only, never exported. */
  guides: boolean;
}

export interface Storyboard {
  schemaVersion: number;
  id: string;
  title: string;
  aspect: AspectRatio;
  /** Contact-sheet page color. */
  paper: string;
  brief: string;
  author: string;
  frames: Frame[];
  createdAt: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  addedAt: number;
}

export type FrameObjectOrKind = FrameObject;
