import { describe, expect, it } from "vitest";
import { layoutContactSheet, wrapMonoCaption } from "../../src/export/contactsheet";
import { newFrame, newStoryboard } from "../../src/model/defaults";
import type { AssetResolver } from "../../src/render/primitives";

const resolve: AssetResolver = () => undefined;

function board(frames: number) {
  return newStoryboard({
    title: "Sheet test",
    aspect: "16:9",
    brief: "A brief",
    author: "Tester",
    frames: Array.from({ length: frames }, () => newFrame({ caption: { text: `Caption ${Math.random()}`, visible: true } })),
  });
}

describe("wrapMonoCaption", () => {
  it("wraps long text into maxLines with an ellipsis", () => {
    const lines = wrapMonoCaption("word ".repeat(40).trim(), 240, 15, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("\u2026")).toBe(true);
  });
  it("keeps short text on one line untouched", () => {
    expect(wrapMonoCaption("short", 240, 15, 2)).toEqual(["short"]);
  });
});

describe("layoutContactSheet", () => {
  it("uses 3 columns and 6 cells per page for 8 frames", () => {
    const pages = layoutContactSheet(board(8), resolve);
    expect(pages).toHaveLength(2);
    expect(pages[0].cells).toHaveLength(6);
    expect(pages[1].cells).toHaveLength(2);
    expect(pages[0].cells[0].index).toBe(0);
    expect(pages[1].cells[1].index).toBe(7);
  });

  it("uses 2 columns for tiny boards", () => {
    const pages = layoutContactSheet(board(3), resolve);
    expect(pages).toHaveLength(1);
    expect(pages[0].cells).toHaveLength(3);
  });

  it("scales cell art to the aspect and reports meta", () => {
    const pages = layoutContactSheet(board(1), resolve);
    const cell = pages[0].cells[0];
    expect(cell.artH).toBeCloseTo(cell.artW / (16 / 9), 0);
    expect(pages[0].title).toBe("Sheet test");
    expect(pages[0].meta).toContain("16:9");
    expect(pages[0].meta).toContain("Board by Tester");
    expect(pages[0].pageCount).toBe(1);
  });

  it("keeps invisible captions out of the cell", () => {
    const sb = board(1);
    sb.frames[0].caption = { text: "hidden words", visible: false };
    const pages = layoutContactSheet(sb, resolve);
    expect(pages[0].cells[0].captionLines).toHaveLength(0);
  });
});
