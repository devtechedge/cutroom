import { describe, expect, it } from "vitest";
import { openSimpleDB } from "../../src/persist/db";

describe("openSimpleDB fallback", () => {
  it("resolves to the memory store when IndexedDB is unavailable", async () => {
    const db = await openSimpleDB();
    expect(["idb", "memory"]).toContain(db.mode);
    await db.put("projects", "a", { id: "a" });
    expect(await db.get("projects", "a")).toEqual({ id: "a" });
    expect(await db.getAllKeys("projects")).toEqual(["a"]);
    expect(await db.getAll("projects")).toHaveLength(1);
    await db.delete("projects", "a");
    expect(await db.get("projects", "a")).toBeUndefined();
  });

  it("keeps stores isolated", async () => {
    const db = await openSimpleDB();
    await db.put("projects", "k", 1);
    await db.put("assets", "k", 2);
    expect(await db.get("projects", "k")).toBe(1);
    expect(await db.get("assets", "k")).toBe(2);
  });
});
