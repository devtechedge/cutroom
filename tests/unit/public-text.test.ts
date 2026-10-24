import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const roots = ["src"];
const files = ["README.md", "index.html", "SECURITY.md", "LICENSES.md"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx|css|html|md)$/.test(entry.name)) out.push(path);
  }
  return out;
}

describe("public text", () => {
  it("uses no em dashes and no en dashes outside numeric ranges", () => {
    const targets = [
      ...roots.flatMap((dir) => walk(join(root, dir))),
      ...files.map((file) => join(root, file)),
    ];
    const hits: string[] = [];
    for (const file of targets) {
      const text = readFileSync(file, "utf8");
      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char !== "\u2014" && char !== "\u2013") continue;
        if (char === "\u2013" && /\d/.test(text[i - 1] ?? "") && /\d/.test(text[i + 1] ?? "")) continue;
        hits.push(`${relative(root, file)}:${text.slice(0, i).split("\n").length}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
