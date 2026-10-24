import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

describe("security and discovery config", () => {
  const config = JSON.parse(read("vercel.json")) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const headers = config.headers[0].headers;
  const csp = headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

  it("sets the security headers", () => {
    expect(headers.map((header) => header.key)).toEqual(
      expect.arrayContaining(["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]),
    );
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("allows every inline script by hash", () => {
    const scripts = inlineScripts(read("index.html"));
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      const hash = `sha256-${createHash("sha256").update(script).digest("base64")}`;
      expect(csp).toContain(`'${hash}'`);
    }
  });

  it("links the discovery files and social image text", () => {
    const html = read("index.html");
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:image:alt"');
    expect(html).toContain('name="twitter:image:alt"');
  });

  it("ships robots, sitemap and a web manifest", () => {
    for (const file of ["robots.txt", "sitemap.xml", "manifest.webmanifest"]) {
      expect(existsSync(join(root, "public", file))).toBe(true);
    }
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as { name: string; icons: unknown[] };
    expect(manifest.name).toBe("CUTROOM");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(read("public/sitemap.xml")).toContain("https://cutroom-green.vercel.app/");
    expect(read("public/robots.txt")).toContain("Sitemap: https://cutroom-green.vercel.app/sitemap.xml");
  });
});
