import { describe, expect, it } from "vitest";
import { sanitizeStoryboard, sanitizeAsset } from "../../src/model/validate";
import { newStoryboard } from "../../src/model/defaults";
import type { Frame } from "../../src/model/types";

describe("sanitizeStoryboard", () => {
  it("keeps a valid storyboard intact", () => {
    const sb = newStoryboard({ title: "Kept", aspect: "4:3", brief: "b", author: "a" });
    const { value, fixes } = sanitizeStoryboard(JSON.parse(JSON.stringify(sb)));
    expect(fixes).toHaveLength(0);
    expect(value.title).toBe("Kept");
    expect(value.aspect).toBe("4:3");
    expect(value.frames).toHaveLength(sb.frames.length);
  });

  it("throws on non-objects and unsupported versions", () => {
    expect(() => sanitizeStoryboard("nope")).toThrow();
    expect(() => sanitizeStoryboard([1, 2])).toThrow();
    expect(() => sanitizeStoryboard({ schemaVersion: 99 })).toThrow(/Unsupported project version/);
  });

  it("reports a missing schemaVersion as a fix, not an error", () => {
    const sb = JSON.parse(JSON.stringify(newStoryboard()));
    delete sb.schemaVersion;
    const { value, fixes } = sanitizeStoryboard(sb);
    expect(value.schemaVersion).toBe(1);
    expect(fixes.some((f) => f.path === "schemaVersion")).toBe(true);
  });

  it("drops junk objects and keeps valid ones", () => {
    const sb = JSON.parse(JSON.stringify(newStoryboard()));
    sb.frames[0].objects.push({ kind: "rocket", x: 10 }, null, { kind: "shape", shape: "rect", x: 5, y: 5, w: 50, h: 50 });
    const { value, fixes } = sanitizeStoryboard(sb);
    expect(value.frames[0].objects).toHaveLength(1);
    expect(fixes.filter((f) => f.message.startsWith("dropped"))).toHaveLength(2);
  });

  it("drops images with missing asset references", () => {
    const sb = JSON.parse(JSON.stringify(newStoryboard()));
    sb.frames[0].objects.push({ kind: "image", assetId: "" }, { kind: "image", assetId: 42 });
    const { value } = sanitizeStoryboard(sb);
    expect(value.frames[0].objects).toHaveLength(0);
  });

  it("clamps numbers into range and normalizes colors", () => {
    const sb = JSON.parse(JSON.stringify(newStoryboard()));
    sb.frames[0].duration = 999;
    sb.frames[0].background = "#AABBCC";
    sb.frames[0].objects.push({ kind: "shape", shape: "rect", x: -500, y: -500, w: 50, h: 50, opacity: 7, fill: "#ABCDEF" });
    const { value } = sanitizeStoryboard(sb);
    expect(value.frames[0].duration).toBe(30);
    expect(value.frames[0].background).toBe("#aabbcc");
    const o = value.frames[0].objects[0];
    expect(o.x).toBe(0);
    expect(o.opacity).toBe(1);
    expect((o as { fill: string }).fill).toBe("#abcdef");
  });

  it("regenerates duplicate frame ids and reports it", () => {
    const sb = JSON.parse(JSON.stringify(newStoryboard()));
    const id = sb.frames[0].id;
    sb.frames.push(JSON.parse(JSON.stringify(sb.frames[0])));
    const { value, fixes } = sanitizeStoryboard(sb);
    expect(value.frames[0].id).toBe(id);
    expect(value.frames[1].id).not.toBe(id);
    expect(fixes.some((f) => f.message.includes("duplicate id"))).toBe(true);
  });

  it("caps the frame count and adds a blank frame when empty", () => {
    const sb = JSON.parse(JSON.stringify(newStoryboard()));
    const proto: Frame = sb.frames[0];
    sb.frames = Array.from({ length: 250 }, () => proto);
    const { value, fixes } = sanitizeStoryboard(sb);
    expect(value.frames).toHaveLength(200);
    expect(fixes.some((f) => f.message.includes("kept first 200"))).toBe(true);
    const empty = sanitizeStoryboard({ schemaVersion: 1, frames: [] });
    expect(empty.value.frames).toHaveLength(1);
  });

  it("falls back to a safe aspect and rejects unknown enums", () => {
    const sb = JSON.parse(JSON.stringify(newStoryboard()));
    sb.aspect = "21:9";
    sb.frames[0].transitionIn = "sparkle";
    sb.frames[0].shot = "WOW";
    const { value, fixes } = sanitizeStoryboard(sb);
    expect(value.aspect).toBe("16:9");
    expect(value.frames[0].transitionIn).toBe("cut");
    expect(value.frames[0].shot).toBe("");
    expect(fixes.some((f) => f.path === "aspect")).toBe(true);
  });
});

describe("sanitizeAsset", () => {
  it("accepts a data-url image and rejects junk", () => {
    const asset = { id: "a1", name: "x", mime: "image/png", dataUrl: "data:image/png;base64,AAAA", width: 4, height: 4, bytes: 8, addedAt: 1 };
    expect(sanitizeAsset(asset)?.id).toBe("a1");
    expect(sanitizeAsset({ ...asset, dataUrl: "http://evil" })).toBeNull();
    expect(sanitizeAsset(null)).toBeNull();
    expect(sanitizeAsset({ ...asset, dataUrl: "data:image/png;base64," + "A".repeat(13_000_000) })).toBeNull();
  });
});
