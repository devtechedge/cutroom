import { describe, expect, it } from "vitest";
import { commit, initHistory, redo, undo, HISTORY_LIMIT } from "../../src/state/history";
import type { Storyboard } from "../../src/model/types";
import { newStoryboard } from "../../src/model/defaults";

function sb(title: string): Storyboard {
  return { ...newStoryboard({ title }), id: "sb-1" };
}

describe("history", () => {
  it("commits push the present into the past and clear the redo branch", () => {
    const h0 = initHistory(sb("v1"));
    const h1 = commit(h0, sb("v2"), "edit", 1000);
    const h2 = commit(h1, sb("v3"), "edit", 2000);
    expect(h2.past.map((s) => s.title)).toEqual(["v1", "v2"]);
    expect(h2.present.title).toBe("v3");
    expect(h2.future).toHaveLength(0);
    const h3 = commit(h2, sb("v4"), "edit", 3000);
    const u1 = undo(h3);
    const r1 = redo(u1);
    expect(r1.present.title).toBe("v4");
    const h4 = commit(r1, sb("v5"), "edit", 4000);
    expect(h4.future).toHaveLength(0);
  });

  it("coalesces same-label commits inside the window", () => {
    const h0 = initHistory(sb("v1"));
    const h1 = commit(h0, sb("v2"), "type", 1000);
    const h2 = commit(h1, sb("v3"), "type", 1300);
    expect(h2.past).toHaveLength(1);
    expect(h2.present.title).toBe("v3");
  });

  it("does not coalesce across a gap or a different label", () => {
    const h0 = initHistory(sb("v1"));
    const h1 = commit(h0, sb("v2"), "type", 1000);
    const h2 = commit(h1, sb("v3"), "type", 1000 + 601);
    expect(h2.past).toHaveLength(2);
    const h3 = commit(h2, sb("v4"), "move", 1100);
    expect(h3.past).toHaveLength(3);
  });

  it("undo and redo move entries between stacks", () => {
    let h = initHistory(sb("v1"));
    h = commit(h, sb("v2"), "a", 1);
    h = commit(h, sb("v3"), "b", 2);
    h = undo(h);
    expect(h.present.title).toBe("v2");
    expect(h.future.map((s) => s.title)).toEqual(["v3"]);
    h = undo(h);
    expect(h.present.title).toBe("v1");
    expect(undo(h)).toBe(h);
    h = redo(h);
    h = redo(h);
    expect(h.present.title).toBe("v3");
    expect(redo(h)).toBe(h);
  });

  it("caps the past at HISTORY_LIMIT", () => {
    let h = initHistory(sb("v0"));
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      h = commit(h, sb(`v${i + 1}`), `step-${i}`, i * 10_000);
    }
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0].title).toBe("v20");
  });
});
