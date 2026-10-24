import { describe, expect, it } from "vitest";
import {
  addObject,
  duplicateFrame,
  duplicateObjects,
  duplicateStoryboard,
  insertFrameAfter,
  moveFrame,
  moveObjectZ,
  removeObject,
  removeObjects,
  removeFrame,
  setFrameMeta,
  updateObject,
  updateObjects,
} from "../../src/model/ops";
import { newFrame, newShapeObject, newStoryboard } from "../../src/model/defaults";

function setup() {
  const a = newShapeObject({ x: 10, y: 10, w: 50, h: 50 });
  const b = newShapeObject({ x: 100, y: 100, w: 50, h: 50 });
  const f1 = newFrame({ objects: [a, b] });
  const f2 = newFrame({});
  const sb = newStoryboard({ frames: [f1, f2] });
  return { sb, f1, f2, a, b };
}

describe("frame ops", () => {
  it("inserts after an index and clamps out-of-range positions", () => {
    const { sb } = setup();
    const f = newFrame();
    expect(insertFrameAfter(sb, -5, f).index).toBe(0);
    expect(insertFrameAfter(sb, 99, f).index).toBe(sb.frames.length);
  });

  it("duplicates a frame with fresh ids", () => {
    const { sb, f1 } = setup();
    const out = duplicateFrame(sb, f1.id);
    expect(out.frames).toHaveLength(3);
    expect(out.frames[1].id).not.toBe(f1.id);
    expect(out.frames[1].objects[0].id).not.toBe(f1.objects[0].id);
    expect(out.frames[1].caption.text).toBe(f1.caption.text);
  });

  it("refuses to remove the last frame", () => {
    const sb = newStoryboard();
    const out = removeFrame(sb, sb.frames[0].id);
    expect(out.removed).toBe(false);
    expect(out.sb.frames).toHaveLength(1);
  });

  it("moves frames and reports the new index", () => {
    const { sb } = setup();
    const moved = moveFrame(sb, 0, 1);
    expect(moved.index).toBe(1);
    expect(moved.sb.frames[1].id).toBe(sb.frames[0].id);
    const same = moveFrame(sb, 5, 99);
    expect(same.index).toBe(sb.frames.length - 1);
  });
});

describe("object ops", () => {
  it("adds and removes objects", () => {
    const { sb, f1, f2 } = setup();
    const c = newShapeObject({});
    const withC = addObject(sb, f1.id, c);
    expect(withC.frames[0].objects).toHaveLength(3);
    const without = removeObject(withC, f1.id, c.id);
    expect(without.frames[0].objects).toHaveLength(2);
    expect(removeObject(withC, f2.id, c.id).frames[0].objects).toHaveLength(3);
  });

  it("clamps updated objects into the frame", () => {
    const { sb, f1, a } = setup();
    const out = updateObject(sb, f1.id, a.id, { x: 990, y: 500, w: 400, h: 300 });
    const moved = out.frames[0].objects[0];
    expect(moved.x).toBeLessThanOrEqual(600);
    expect(moved.y).toBeLessThanOrEqual(262.5);
  });

  it("reorders z from both ends", () => {
    const { sb, f1, a } = setup();
    const front = moveObjectZ(sb, f1.id, a.id, "front");
    expect(front.frames[0].objects[1].id).toBe(a.id);
    const back = moveObjectZ(front, f1.id, a.id, "back");
    expect(back.frames[0].objects[0].id).toBe(a.id);
    expect(moveObjectZ(sb, f1.id, "missing", "front").frames[0].objects).toEqual(sb.frames[0].objects);
  });

  it("updates frame meta and touches updatedAt", () => {
    const { sb, f1 } = setup();
    const later = setFrameMeta(sb, f1.id, { notes: "note" });
    expect(later.frames[0].notes).toBe("note");
    expect(later.updatedAt).toBeGreaterThanOrEqual(sb.updatedAt);
  });

  it("removes several objects in one pass", () => {
    const { sb, f1, a, b } = setup();
    const out = removeObjects(sb, f1.id, [a.id, b.id]);
    expect(out.frames[0].objects).toHaveLength(0);
    expect(out.frames[1].objects).toHaveLength(0);
  });

  it("moves several objects through one update call", () => {
    const { sb, f1, a, b } = setup();
    const out = updateObjects(sb, f1.id, {
      [a.id]: { x: 20, y: 20 },
      [b.id]: { x: 120, y: 120 },
    });
    expect(out.frames[0].objects[0].x).toBe(20);
    expect(out.frames[0].objects[1].x).toBe(120);
  });

  it("duplicates selected objects with fresh ids and an offset", () => {
    const { sb, f1, a, b } = setup();
    const out = duplicateObjects(sb, f1.id, [a.id, b.id], 20);
    expect(out.ids).toHaveLength(2);
    expect(out.sb.frames[0].objects).toHaveLength(4);
    const copies = out.sb.frames[0].objects.slice(2);
    expect(copies.map((o) => o.id)).toEqual(out.ids);
    expect(new Set(out.sb.frames[0].objects.map((o) => o.id)).size).toBe(4);
    expect(copies[0].x).toBe(a.x + 20);
    expect(copies[0].y).toBe(a.y + 20);
  });
});

describe("duplicateStoryboard", () => {
  it("gives every id a new value and keeps content", () => {
    const { sb, f1 } = setup();
    const copy = duplicateStoryboard(sb, "Copy");
    expect(copy.id).not.toBe(sb.id);
    expect(copy.title).toBe("Copy");
    expect(copy.frames[0].id).not.toBe(f1.id);
    expect(copy.frames[0].objects).toHaveLength(f1.objects.length);
    expect(copy.frames[0].background).toBe(f1.background);
  });
});
