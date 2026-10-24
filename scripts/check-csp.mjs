import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const config = JSON.parse(readFileSync("vercel.json", "utf8"));
const headers = config.headers.flatMap((entry) => entry.headers);
const csp = headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);

if (!csp) {
  console.error("CSP header is missing");
  process.exit(1);
}
for (const script of scripts) {
  const hash = `sha256-${createHash("sha256").update(script).digest("base64")}`;
  if (!csp.includes(`'${hash}'`)) {
    console.error(`CSP is missing ${hash}`);
    process.exit(1);
  }
}
console.log(`CSP allows ${scripts.length} inline scripts`);
