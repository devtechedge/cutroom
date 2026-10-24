import { describe, expect, it } from "vitest";
import { buildProjectFile, parseProjectFile, remapAssetIds } from "../../src/export/projectfile";
import { newImageObject, newStoryboard } from "../../src/model/defaults";
import type { Asset, ImageObject } from "../../src/model/types";

const asset: Asset = {
  id: "asset-1",
  name: "pixel.png",
  mime: "image/png",
  dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  width: 1,
  height: 1,
  bytes: 68,
  addedAt: 1,
};

const unused: Asset = { ...asset, id: "asset-unused", name: "unused.png" };

function boardWithImage() {
  const sb = newStoryboard({ title: "Portable board" });
  const frame = sb.frames[0];
  frame.objects.push(newImageObject("asset-1", { x: 0, y: 0, w: 100, h: 100 }));
  return sb;
}

describe("project file", () => {
  it("includes only assets referenced by the board", () => {
    const file = buildProjectFile(boardWithImage(), [asset, unused]);
    expect(file.format).toBe("cutroom-project");
    expect(file.schemaVersion).toBe(2);
    expect(file.storyboard.title).toBe("Portable board");
    expect(file.assets.map((a) => a.id)).toEqual(["asset-1"]);
  });

  it("round-trips a board and its image asset", () => {
    const file = buildProjectFile(boardWithImage(), [asset]);
    const parsed = parseProjectFile(JSON.parse(JSON.stringify(file)));
    expect(parsed.fixes).toEqual([]);
    expect(parsed.sb.title).toBe("Portable board");
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0].dataUrl).toBe(asset.dataUrl);
  });

  it("warns when a version 1 file has image objects", () => {
    const parsed = parseProjectFile(boardWithImage());
    expect(parsed.assets).toEqual([]);
    expect(parsed.fixes.some((fix) => fix.message.includes("version 1 files do not include images"))).toBe(true);
  });

  it("does not warn for a version 1 file without image objects", () => {
    const parsed = parseProjectFile(newStoryboard({ title: "No images" }));
    expect(parsed.assets).toEqual([]);
    expect(parsed.fixes).toEqual([]);
  });

  it("reports a malformed asset and leaves the image reference missing", () => {
    const file = buildProjectFile(boardWithImage(), [asset]);
    const broken = { ...file, assets: [{ ...asset, dataUrl: "https://example.com/pixel.png" }] };
    const parsed = parseProjectFile(broken);
    expect(parsed.assets).toEqual([]);
    expect(parsed.fixes.some((fix) => fix.message.includes("missing image asset"))).toBe(true);
  });

  it("remaps image asset references", () => {
    const remapped = remapAssetIds(boardWithImage(), new Map([["asset-1", "asset-2"]]));
    const image = remapped.frames[0].objects[0] as ImageObject;
    expect(image.assetId).toBe("asset-2");
  });
});
