import { describe, expect, it } from "vitest";
import { fitImageDimensions, MAX_IMAGE_DIMENSION } from "../../src/lib/assets";

describe("fitImageDimensions", () => {
  it("keeps images inside the cap unchanged", () => {
    expect(fitImageDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it("scales the longest side down to the cap", () => {
    expect(fitImageDimensions(9000, 4500)).toEqual({ width: MAX_IMAGE_DIMENSION, height: 2048 });
    expect(fitImageDimensions(4000, 8000)).toEqual({ width: 2048, height: MAX_IMAGE_DIMENSION });
  });

  it("never returns a zero dimension", () => {
    const fitted = fitImageDimensions(1, 9000);
    expect(fitted.width).toBe(1);
    expect(fitted.height).toBe(MAX_IMAGE_DIMENSION);
  });
});
