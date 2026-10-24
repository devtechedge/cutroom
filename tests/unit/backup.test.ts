import { describe, expect, it } from "vitest";
import { buildBackupFile, parseBackupFile, serializeBackupFile } from "../../src/export/backup";
import { buildProjectFile } from "../../src/export/projectfile";
import { newImageObject, newStoryboard } from "../../src/model/defaults";
import type { Asset, Storyboard } from "../../src/model/types";

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

function board(title: string, withImage = false): Storyboard {
  const sb = newStoryboard({ title });
  if (withImage) sb.frames[0].objects.push(newImageObject(asset.id, { x: 0, y: 0, w: 100, h: 100 }));
  return sb;
}

describe("backup file", () => {
  it("packages several projects and their referenced assets", () => {
    const file = buildBackupFile([board("One", true), board("Two")], [asset]);
    expect(file.format).toBe("cutroom-backup");
    expect(file.projects).toHaveLength(2);
    expect(file.projects[0].assets).toHaveLength(1);
    expect(file.projects[1].assets).toHaveLength(0);
  });

  it("round-trips through JSON", () => {
    const text = serializeBackupFile([board("One", true), board("Two")], [asset]);
    const parsed = parseBackupFile(JSON.parse(text));
    expect(parsed.projects.map((entry) => entry.sb.title)).toEqual(["One", "Two"]);
    expect(parsed.projects[0].assets[0].id).toBe(asset.id);
    expect(parsed.fixes).toEqual([]);
  });

  it("rejects a file that is not a backup", () => {
    expect(() => parseBackupFile({ format: "cutroom-project", schemaVersion: 2 })).toThrow(/not a CUTROOM backup/);
  });

  it("rejects an empty backup", () => {
    expect(() => parseBackupFile({ format: "cutroom-backup", schemaVersion: 1, projects: [] })).toThrow(/does not contain any boards/);
  });

  it("skips malformed entries and reports a fix", () => {
    const valid = buildProjectFile(board("Valid"), []);
    const parsed = parseBackupFile({
      format: "cutroom-backup",
      schemaVersion: 1,
      exportedAt: 1,
      projects: [valid, { format: "something-else" }],
    });
    expect(parsed.projects).toHaveLength(1);
    expect(parsed.fixes.some((fix) => fix.path === "projects[1]")).toBe(true);
  });
});
