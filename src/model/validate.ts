import { newId } from "./ids";
import { clamp, frameHeightUnits } from "./geometry";
import {
  BRIEF_MAX,
  CAPTION_MAX,
  DURATION_MAX,
  DURATION_MIN,
  MAX_FRAMES,
  MAX_OBJECTS_PER_FRAME,
  NOTES_MAX,
  TEXT_MAX,
  TITLE_MAX,
  clampDuration,
  newFrame,
  newStoryboard,
} from "./defaults";
import {
  ASPECT_RATIOS,
  SCHEMA_VERSION,
  SHOT_TYPES,
  TRANSITIONS,
  type AspectRatio,
  type Caption,
  type Frame,
  type FrameObject,
  type ImageObject,
  type ShapeObject,
  type Storyboard,
  type TextObject,
  type Transition,
} from "./types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface SanitizeResult {
  value: Storyboard;
  /** Non-fatal fixes applied while restoring. */
  fixes: ValidationIssue[];
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback: string, max: number): string {
  if (typeof v !== "string") return fallback;
  return v.length > max ? v.slice(0, max) : v;
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

function color(v: unknown, fallback: string): string {
  if (typeof v === "string" && COLOR_RE.test(v)) return v.toLowerCase();
  return fallback;
}

/** Shape fills may be "none" (stroke-only shapes). */
function colorOrNone(v: unknown, fallback: string): string {
  if (v === "none") return "none";
  return color(v, fallback);
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function sanitizeCaption(v: unknown): Caption {
  const rec = isRecord(v) ? v : {};
  return {
    text: str(rec.text, "", CAPTION_MAX),
    visible: typeof rec.visible === "boolean" ? rec.visible : true,
  };
}

function sanitizeObject(v: unknown, height: number, fixes: ValidationIssue[], path: string): FrameObject | null {
  if (!isRecord(v)) {
    fixes.push({ path, message: "dropped: not an object" });
    return null;
  }
  const id = typeof v.id === "string" && v.id.length <= 64 ? v.id : newId();
  const base = {
    id,
    x: num(v.x, 100, 0, 1000),
    y: num(v.y, 100, 0, height),
    w: num(v.w, 300, 1, 1000),
    h: num(v.h, 200, 0, height),
    opacity: num(v.opacity, 1, 0, 1),
  };
  const kind = v.kind;
  if (kind === "image") {
    if (typeof v.assetId !== "string" || v.assetId.length === 0 || v.assetId.length > 64) {
      fixes.push({ path, message: "image dropped: missing or invalid asset reference" });
      return null;
    }
    const img: ImageObject = {
      ...base,
      kind: "image",
      assetId: v.assetId,
      fit: pick(v.fit, ["contain", "cover"] as const, "cover"),
      borderWidth: num(v.borderWidth, 0, 0, 40),
      borderColor: color(v.borderColor, "#201d18"),
      cornerRadius: num(v.cornerRadius, 0, 0, 48),
    };
    return img;
  }
  if (kind === "shape") {
    const shape: ShapeObject = {
      ...base,
      kind: "shape",
      shape: pick(v.shape, ["rect", "ellipse", "line", "triangle"] as const, "rect"),
      fill: colorOrNone(v.fill, "#d7f04c"),
      strokeColor: color(v.strokeColor, "#201d18"),
      strokeWidth: num(v.strokeWidth, 0, 0, 40),
      cornerRadius: num(v.cornerRadius, 0, 0, 48),
    };
    return shape;
  }
  if (kind === "text") {
    const txt: TextObject = {
      ...base,
      kind: "text",
      text: str(v.text, "Text", TEXT_MAX),
      font: pick(v.font, ["grotesk", "serif", "mono"] as const, "grotesk"),
      size: num(v.size, 48, 8, 220),
      weight: num(v.weight, 500, 300, 800),
      align: pick(v.align, ["left", "center", "right"] as const, "left"),
      color: color(v.color, "#201d18"),
      lineHeight: num(v.lineHeight, 1.15, 0.9, 2),
      letterSpacing: num(v.letterSpacing, 0, -0.04, 0.4),
    };
    return txt;
  }
  fixes.push({ path, message: `dropped: unknown object kind` });
  return null;
}

function sanitizeFrame(v: unknown, aspect: AspectRatio, fixes: ValidationIssue[], path: string): Frame | null {
  if (!isRecord(v)) {
    fixes.push({ path, message: "frame dropped: not an object" });
    return null;
  }
  const frame = newFrame();
  const height = frameHeightUnits(aspect);
  const rawObjects = Array.isArray(v.objects) ? v.objects.slice(0, MAX_OBJECTS_PER_FRAME) : [];
  const objects: FrameObject[] = [];
  for (let i = 0; i < rawObjects.length; i++) {
    const o = sanitizeObject(rawObjects[i], height, fixes, `${path}.objects[${i}]`);
    if (o) objects.push(o);
  }
  return {
    id: typeof v.id === "string" && v.id.length <= 64 ? v.id : newId(),
    background: color(v.background, frame.background),
    objects,
    caption: sanitizeCaption(v.caption),
    notes: str(v.notes, "", NOTES_MAX),
    shot: v.shot === "" ? "" : pick(v.shot, SHOT_TYPES, ""),
    duration: clampDuration(num(v.duration, frame.duration, DURATION_MIN, DURATION_MAX)),
    transitionIn: pick<Transition>(v.transitionIn, TRANSITIONS, "cut"),
    guides: false,
  };
}

/**
 * Tolerant normalizer for restored and imported storyboards. Rebuilds the
 * value field-by-field, clamps numbers, regenerates missing ids, drops
 * unknown kinds, and reports every fix so imports can explain themselves.
 * Throws only when the payload cannot be a storyboard at all.
 */
export function sanitizeStoryboard(input: unknown): SanitizeResult {
  const fixes: ValidationIssue[] = [];
  if (!isRecord(input)) {
    throw new Error("File does not contain a CUTROOM project object.");
  }
  if (input.schemaVersion === undefined) {
    fixes.push({ path: "schemaVersion", message: "missing; treated as 1" });
  } else if (input.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported project version ${String(input.schemaVersion)}; this build reads version ${SCHEMA_VERSION}.`,
    );
  }
  const aspect = pick<AspectRatio>(input.aspect, ASPECT_RATIOS, "16:9");
  if (input.aspect !== aspect) {
    fixes.push({ path: "aspect", message: `invalid; set to ${aspect}` });
  }
  const rawFrames = Array.isArray(input.frames) ? input.frames : [];
  if (!Array.isArray(input.frames)) {
    fixes.push({ path: "frames", message: "missing; started an empty board" });
  }
  const frames: Frame[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < Math.min(rawFrames.length, MAX_FRAMES); i++) {
    const f = sanitizeFrame(rawFrames[i], aspect, fixes, `frames[${i}]`);
    if (!f) continue;
    if (seenIds.has(f.id)) {
      fixes.push({ path: `frames[${i}].id`, message: "duplicate id; regenerated" });
      f.id = newId();
    }
    seenIds.add(f.id);
    frames.push(f);
  }
  if (rawFrames.length > MAX_FRAMES) {
    fixes.push({ path: "frames", message: `kept first ${MAX_FRAMES} of ${rawFrames.length} frames` });
  }
  if (frames.length === 0) {
    frames.push(newFrame());
    fixes.push({ path: "frames", message: "empty; added a blank frame" });
  }
  const now = Date.now();
  const sb = newStoryboard();
  const value: Storyboard = {
    ...sb,
    id: typeof input.id === "string" && input.id.length <= 64 ? input.id : newId(),
    title: str(input.title, "Untitled board", TITLE_MAX) || "Untitled board",
    aspect,
    paper: color(input.paper, "#efe9db"),
    brief: str(input.brief, "", BRIEF_MAX),
    author: str(input.author, "", 80),
    frames,
    createdAt: num(input.createdAt, now, 0, now),
    updatedAt: num(input.updatedAt, now, 0, now),
  };
  return { value, fixes };
}

/** Validate an uploaded asset record coming back out of storage. */
export function sanitizeAsset(input: unknown): import("./types").Asset | null {
  if (!isRecord(input)) return null;
  const dataUrl = input.dataUrl;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null;
  if (dataUrl.length > 12_000_000) return null;
  return {
    id: typeof input.id === "string" && input.id.length <= 64 ? input.id : newId(),
    name: str(input.name, "image", 120),
    mime: typeof input.mime === "string" && input.mime.startsWith("image/") ? input.mime : "image/png",
    dataUrl,
    width: num(input.width, 0, 0, 20000),
    height: num(input.height, 0, 0, 20000),
    bytes: num(input.bytes, 0, 0, 20_000_000),
    addedAt: num(input.addedAt, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}
