import { clampDuration, fitObjectToFrame, newFrame } from "./defaults";
import { newId } from "./ids";
import type { Frame, FrameObject, Storyboard } from "./types";

function touch(sb: Storyboard, frames?: Frame[]): Storyboard {
  return { ...sb, frames: frames ?? sb.frames, updatedAt: Date.now() };
}

export function setFrameMeta(sb: Storyboard, frameId: string, patch: Partial<Omit<Frame, "id" | "objects">>): Storyboard {
  return touch(sb, sb.frames.map((f) => (f.id === frameId ? { ...f, ...patch } : f)));
}

export function setStoryboardMeta(sb: Storyboard, patch: Partial<Omit<Storyboard, "id" | "frames" | "schemaVersion">>): Storyboard {
  return touch(sb, sb.frames.map((f) => f));
}

export function insertFrameAfter(sb: Storyboard, afterIndex: number, frame: Frame = newFrame()): { sb: Storyboard; index: number } {
  const index = Math.max(-1, Math.min(afterIndex, sb.frames.length - 1)) + 1;
  const frames = [...sb.frames];
  frames.splice(index, 0, frame);
  return { sb: touch(sb, frames), index };
}

export function duplicateFrame(sb: Storyboard, frameId: string): Storyboard {
  const index = sb.frames.findIndex((f) => f.id === frameId);
  if (index === -1) return sb;
  const source = sb.frames[index];
  const copy: Frame = {
    ...source,
    id: newId(),
    caption: { ...source.caption },
    objects: source.objects.map((o) => ({ ...o, id: newId() })),
  };
  const frames = [...sb.frames];
  frames.splice(index + 1, 0, copy);
  return touch(sb, frames);
}

export function removeFrame(sb: Storyboard, frameId: string): { sb: Storyboard; removed: boolean } {
  if (sb.frames.length <= 1) return { sb, removed: false };
  const frames = sb.frames.filter((f) => f.id !== frameId);
  if (frames.length === sb.frames.length) return { sb, removed: false };
  return { sb: touch(sb, frames), removed: true };
}

/** Move a frame from one index to another; returns the new index of the moved frame. */
export function moveFrame(sb: Storyboard, from: number, to: number): { sb: Storyboard; index: number } {
  const n = sb.frames.length;
  const fromIdx = Math.max(0, Math.min(from, n - 1));
  const toIdx = Math.max(0, Math.min(to, n - 1));
  if (fromIdx === toIdx) return { sb, index: fromIdx };
  const frames = [...sb.frames];
  const [moved] = frames.splice(fromIdx, 1);
  frames.splice(toIdx, 0, moved);
  return { sb: touch(sb, frames), index: toIdx };
}

export function addObject(sb: Storyboard, frameId: string, obj: FrameObject): Storyboard {
  return touch(sb, sb.frames.map((f) => (f.id === frameId ? { ...f, objects: [...f.objects, obj] } : f)));
}

export function updateObject(sb: Storyboard, frameId: string, objectId: string, patch: Partial<FrameObject>): Storyboard {
  return touch(
    sb,
    sb.frames.map((f) =>
      f.id === frameId
        ? { ...f, objects: f.objects.map((o) => (o.id === objectId ? fitObjectToFrame({ ...o, ...patch } as FrameObject, sb.aspect)) : o)) 
        : f,
    ),
  );
}

export function removeObject(sb: Storyboard, frameId: string, objectId: string): Storyboard {
  return touch(
    sb,
    sb.frames.map((f) => (f.id === frameId ? { ...f, objects: f.objects.filter((o) => o.id !== objectId) } : f)),
  );
}

export type ZOrder = "front" | "back" | "forward" | "backward";

export function moveObjectZ(sb: Storyboard, frameId: string, objectId: string, dir: ZOrder): Storyboard {
  return touch(
    sb,
    sb.frames.map((f) => {
      if (f.id !== frameId) return f;
      const idx = f.objects.findIndex((o) => o.id === objectId);
      if (idx === -1) return f;
      const objects = [...f.objects];
      const [obj] = objects.splice(idx, 1);
      const target =
        dir === "front" ? objects.length : dir === "back" ? 0 : dir === "forward" ? Math.min(idx + 1, objects.length) : Math.max(idx - 1, 0);
      objects.splice(target, 0, obj);
      return { ...f, objects };
    }),
  );
}

export function setDuration(sb: Storyboard, frameId: string, seconds: number): Storyboard {
  return setFrameMeta(sb, frameId, { duration: clampDuration(seconds) });
}

/** Duplicate the whole project under a new id (gallery "Duplicate"). */
export function duplicateStoryboard(sb: Storyboard, title: string): Storyboard {
  const now = Date.now();
  return {
    ...structuredClone(sb),
    id: newId(),
    title,
    createdAt: now,
    updatedAt: now,
    frames: sb.frames.map((f) => ({
      ...f,
      id: newId(),
      caption: { ...f.caption },
      objects: f.objects.map((o) => ({ ...o, id: newId() })),
    })),
  };
}
