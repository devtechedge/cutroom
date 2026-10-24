import { describe, expect, it } from "vitest";
import { slugify } from "../../src/lib/download";

describe("slugify", () => {
  it("keeps the existing ASCII behavior", () => {
    expect(slugify("Night Shift")).toBe("night-shift");
    expect(slugify("Café")).toBe("cafe");
  });

  it("keeps non-Latin titles instead of falling back", () => {
    expect(slugify("東京")).toBe("東京");
    expect(slugify("नमस्ते बोर्ड")).toContain("नमस्ते");
  });

  it("falls back only when no letters or numbers exist", () => {
    expect(slugify("😀")).toBe("cutroom");
  });
});
