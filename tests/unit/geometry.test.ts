import { describe, expect, it } from "vitest";
import { ASPECT_VALUE, clampBox, fitRect, frameHeightUnits, frameNumber } from "../../src/model/geometry";

describe("frameHeightUnits", () => {
  it("derives height from the aspect ratio", () => {
    expect(frameHeightUnits("16:9")).toBeCloseTo(562.5);
    expect(frameHeightUnits("4:3")).toBeCloseTo(750);
    expect(frameHeightUnits("1:1")).toBe(1000);
    expect(frameHeightUnits("9:16")).toBeCloseTo(1777.78, 1);
  });
});

describe("clampBox", () => {
  it("keeps the box inside the frame", () => {
    expect(clampBox({ x: 900, y: 500, w: 300, h: 200 }, 562.5)).toEqual({ x: 700, y: 362.5, w: 300, h: 200 });
  });
  it("shrinks oversized boxes", () => {
    expect(clampBox({ x: -50, y: -50, w: 2000, h: 2000 }, 562.5)).toEqual({ x: 0, y: 0, w: 1000, h: 562.5 });
  });
  it("honors custom minimums for lines", () => {
    expect(clampBox({ x: 10, y: 10, w: 100, h: 0 }, 562.5, 1, 0).h).toBe(0);
    expect(clampBox({ x: 10, y: 10, w: 100, h: 0 }, 562.5).h).toBe(1);
  });
});

describe("fitRect", () => {
  it("fits wide frames into a tall box", () => {
    const r = fitRect("16:9", 400, 200);
    expect(r.width).toBeCloseTo(200 * (16 / 9), 6);
    expect(r.height).toBe(200);
    expect(r.x).toBeCloseTo((400 - 200 * (16 / 9)) / 2, 6);
  });
  it("fits tall frames into a wide box", () => {
    const r = fitRect("9:16", 400, 800);
    expect(r.width).toBe(400);
    expect(r.height).toBeCloseTo(711.1, 1);
  });
});

describe("frameNumber", () => {
  it("zero-pads the ordinal", () => {
    expect(frameNumber(0)).toBe("01");
    expect(frameNumber(11)).toBe("12");
  });
});

describe("ASPECT_VALUE", () => {
  it("maps every supported ratio", () => {
    expect(ASPECT_VALUE["16:9"]).toBeCloseTo(1.7778, 3);
    expect(ASPECT_VALUE["4:3"]).toBeCloseTo(1.3333, 3);
    expect(ASPECT_VALUE["1:1"]).toBe(1);
    expect(ASPECT_VALUE["9:16"]).toBeCloseTo(0.5625, 4);
  });
});
