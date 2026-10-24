/* Capture product screenshots for the README and social cards. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.env.BASE ?? "http://localhost:5210";
const out = "docs/screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();

// desktop shots at 1440x900
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(base);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/01-gallery.png` });

await page.getByRole("button", { name: /^Open board Night Shift/ }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/02-editor.png` });

await page.getByRole("button", { name: "Preview the sequence" }).click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Next frame" }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/03-preview.png` });
await page.keyboard.press("Escape");

// social card: 1280x640 crop of the editor
const social = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
await social.goto(base);
await social.waitForTimeout(900);
await social.getByRole("button", { name: /^Open board Night Shift/ }).click();
await social.waitForTimeout(800);
await social.screenshot({ path: `${out}/social-preview.png` });

// mobile editor
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mobile.goto(base);
await mobile.waitForTimeout(900);
await mobile.getByRole("button", { name: /^Open board Night Shift/ }).click();
await mobile.waitForTimeout(700);
await mobile.screenshot({ path: `${out}/04-mobile-editor.png` });

// app icon from the favicon svg
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.goto(`data:text/html,<body style="margin:0">${encodeURIComponent("")}<img src="data:image/svg+xml;base64,${Buffer.from(await (await import("node:fs/promises")).readFile("public/favicon.svg")).toString("base64")}" width="180" height="180">`);
await icon.waitForTimeout(300);
await icon.screenshot({ path: "public/apple-touch-icon.png" });

await browser.close();
console.log("captured");
