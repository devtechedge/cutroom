import { describe, expect, it } from "vitest";
import { imagePlacement, renderFrameArt } from "../../src/render/primitives";
import { newFrame, newImageObject, newShapeObject, newTextObject } from "../../src/model/defaults";
import type { AssetResolver } from "../../src/render/primitives";

const resolve: AssetResolver = (id) => (id === "ok" ? { dataUrl: "data:image/png;base64,x", width: 100, height: 50 } : undefined);

describe("imagePlacement", () => {
  it("covers by overflowing the shorter side", () => {
    const p = imagePlacement("cover", 100, 50, 100, 100);
    expect(p.w).toBe(200);
    expect(p.h).toBe(100);
    expect(p.x).toBe(-50);
  });
  it("contains by fitting inside", () => {
    const p = imagePlacement("contain", 100, 50, 100, 100);
    expect(p.w).toBe(100);
    expect(p.h).toBe(50);
    expect(p.y).toBe(25);
  });
  it("degrades on a zero source", () => {
    expect(imagePlacement("cover", 0, 0, 10, 10)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
  });
});

describe("renderFrameArt", () => {
  it("emits background and scaled primitives", () => {
    const frame = newFrame({
      background: "#101010",
      objects: [
        newShapeObject({ shape: "rect", x: 100, y: 100, w: 200, h: 100, fill: "#ff0000", strokeWidth: 0 }),
        newTextObject({ text: "Hi\nThere", x: 10, y: 10, w: 300, size: 50, lineHeight: 1.2 }),
        newShapeObject({ shape: "line", x: 0, y: 0, w: 500, h: 0, strokeWidth: 8 }),
        newShapeObject({ shape: "triangle", x: 0, y: 0, w: 100, h: 100 }),
        newShapeObject({ shape: "ellipse", x: 0, y: 0, w: 100, h: 60 }),
      ],
    });
    const art = renderFrameArt(frame, "16:9", 1000, resolve);
    expect(art.width).toBe(1000);
    expect(art.height).toBeCloseTo(562.5);
    expect(art.background).toBe("#101010");
    const types = art.primitives.map((p) => p.type);
    expect(types).toEqual(["rect", "text", "line", "triangle", "ellipse"]);
    const text = art.primitives[1];
    if (text.type !== "text") throw new Error("expected text");
    expect(text.lines).toEqual(["Hi", "There"]);
    expect(text.fontSize).toBeCloseTo(50);
    const rect = art.primitives[0];
    if (rect.type !== "rect") throw new Error("expected rect");
    expect(rect.fill).toBe("#ff0000");
  });

  it("maps none fills to null", () => {
    const frame = newFrame({ objects: [newShapeObject({ shape: "ellipse", fill: "none", strokeWidth: 6 })] });
    const art = renderFrameArt(frame, "1:1", 500, resolve);
    const p = art.primitives[0];
    if (p.type !== "ellipse") throw new Error("expected ellipse");
    expect(p.fill).toBeNull();
    expect(p.stroke).not.toBeNull();
  });

  it("emits a placeholder and hasMissing for unknown assets", () => {
    const frame = newFrame({ objects: [newImageObject("gone")] });
    const art = renderFrameArt(frame, "16:9", 800, resolve);
    expect(art.hasMissing).toBe(true);
    expect(art.primitives[0].type).toBe("placeholder");
  });

  it("resolves known assets into clipped images", () => {
    const frame = newFrame({ objects: [newImageObject("ok", { fit: "cover", x: 0, y: 0, w: 500, h: 281.25 })] });
    const art = renderFrameArt(frame, "16:9", 1000, resolve);
    const p = art.primitives[0];
    if (p.type !== "image") throw new Error("expected image");
    expect(p.clipW).toBeCloseTo(500);
    expect(p.w).toBeGreaterThan(p.clipW);
    expect(art.hasMissing).toBe(false);
  });
});
