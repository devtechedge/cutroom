import { loadImages, paintArt } from "../render/canvas";
import { FONT_STACKS } from "../render/fonts";
import { renderFrameArt, type AssetResolver, type Primitive } from "../render/primitives";
import { primitiveToSvg } from "../render/svg";
import { layoutContactSheet, SHEET, type SheetPage } from "./contactsheet";
import { downloadBlob, downloadText, slugify } from "../lib/download";
import { buildProjectFile, MAX_PROJECT_BYTES, parseProjectFile, type ParsedProject } from "./projectfile";
import { frameNumber } from "../model/geometry";
import type { Asset, Frame, Storyboard } from "../model/types";

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface SheetInk {
  ink: string;
  muted: string;
  rule: string;
}

export function sheetInk(paper: string): SheetInk {
  return luminance(paper) > 0.45
    ? { ink: "#201d18", muted: "#6b6557", rule: "#c9c2b0" }
    : { ink: "#f2ede3", muted: "#a49c8b", rule: "#4a453c" };
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}\u2026` : s;
}

function paintSheetPage(ctx: CanvasRenderingContext2D, page: SheetPage, images: Map<string, HTMLImageElement>): void {
  const ink = sheetInk(page.paper);
  ctx.fillStyle = page.paper;
  ctx.fillRect(0, 0, page.width, page.height);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ink.ink;
  ctx.font = `600 ${SHEET.headerTitleSize}px ${FONT_STACKS.grotesk}`;
  ctx.fillText(truncate(page.title, 58), SHEET.margin, SHEET.margin + SHEET.headerTitleSize);
  ctx.fillStyle = ink.muted;
  ctx.font = `400 ${SHEET.headerMetaSize}px ${FONT_STACKS.mono}`;
  ctx.fillText(page.meta, SHEET.margin, SHEET.margin + SHEET.headerTitleSize + 30);
  if (page.brief.length > 0) {
    ctx.font = `italic 400 ${SHEET.headerBriefSize}px ${FONT_STACKS.serif}`;
    ctx.fillText(truncate(page.brief, 130), SHEET.margin, SHEET.margin + SHEET.headerTitleSize + 56);
  }
  ctx.strokeStyle = ink.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SHEET.margin, SHEET.margin + SHEET.headerHeight - 26);
  ctx.lineTo(page.width - SHEET.margin, SHEET.margin + SHEET.headerHeight - 26);
  ctx.stroke();

  for (const cell of page.cells) {
    ctx.save();
    ctx.translate(cell.artX, cell.artY);
    const s = cell.artW / cell.art.width;
    ctx.scale(s, s);
    paintArt(ctx, cell.art, images);
    ctx.restore();
    ctx.strokeStyle = ink.rule;
    ctx.lineWidth = 1;
    ctx.strokeRect(cell.artX + 0.5, cell.artY + 0.5, cell.artW - 1, cell.artH - 1);
    const textY = cell.artY + cell.artH;
    ctx.fillStyle = ink.ink;
    ctx.font = `600 20px ${FONT_STACKS.mono}`;
    ctx.textAlign = "left";
    ctx.fillText(frameNumber(cell.index), cell.artX, textY + 26);
    const tagBits: string[] = [];
    if (cell.shot.length > 0) tagBits.push(cell.shot);
    tagBits.push(`${cell.duration.toFixed(1)}s`);
    ctx.fillStyle = ink.muted;
    ctx.font = `400 13px ${FONT_STACKS.mono}`;
    ctx.fillText(tagBits.join(" \u00b7 "), cell.artX + 44, textY + 25);
    cell.captionLines.forEach((line, i) => {
      ctx.fillText(line, cell.artX, textY + 52 + i * SHEET.captionSize * SHEET.captionLineHeight);
    });
  }

  const footerY = page.height - SHEET.margin + 8;
  ctx.strokeStyle = ink.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SHEET.margin, footerY - 26);
  ctx.lineTo(page.width - SHEET.margin, footerY - 26);
  ctx.stroke();
  ctx.fillStyle = ink.muted;
  ctx.font = `400 14px ${FONT_STACKS.mono}`;
  ctx.textAlign = "left";
  ctx.fillText(`CUTROOM - ${truncate(page.title, 48)}`, SHEET.margin, footerY);
  ctx.textAlign = "right";
  ctx.fillText(`${page.frameCount} frames \u00b7 sheet ${page.pageIndex + 1}/${page.pageCount}`, page.width - SHEET.margin, footerY);
  ctx.textAlign = "left";
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), "image/png");
  });
}

async function renderSheetPagePng(page: SheetPage): Promise<Blob> {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  const images = await loadImages(page.cells.map((c) => c.art));
  ctx.scale(scale, scale);
  paintSheetPage(ctx, page, images);
  return canvasToBlob(canvas);
}

export async function exportSheetPng(sb: Storyboard, resolve: AssetResolver): Promise<number> {
  await document.fonts.ready;
  const pages = layoutContactSheet(sb, resolve);
  const slug = slugify(sb.title);
  for (let i = 0; i < pages.length; i++) {
    const blob = await renderSheetPagePng(pages[i]);
    downloadBlob(blob, `${slug}-contact-sheet-${pages.length > 1 ? `p${i + 1}-` : ""}${frameCountLabel(sb)}.png`);
  }
  return pages.length;
}

function frameCountLabel(sb: Storyboard): string {
  return `${sb.frames.length}f`;
}

function sheetCellSvg(page: SheetPage): string {
  const ink = sheetInk(page.paper);
  const fonts = {
    grotesk: escapeXml(FONT_STACKS.grotesk),
    mono: escapeXml(FONT_STACKS.mono),
    serif: escapeXml(FONT_STACKS.serif),
  };
  const out: string[] = [];
  out.push(`<text x="${SHEET.margin}" y="${SHEET.margin + SHEET.headerTitleSize}" font-family="${fonts.grotesk}" font-size="${SHEET.headerTitleSize}" font-weight="600" fill="${ink.ink}">${escapeXml(truncate(page.title, 58))}</text>`);
  out.push(`<text x="${SHEET.margin}" y="${SHEET.margin + SHEET.headerTitleSize + 30}" font-family="${fonts.mono}" font-size="${SHEET.headerMetaSize}" fill="${ink.muted}">${escapeXml(page.meta)}</text>`);
  if (page.brief.length > 0) {
    out.push(`<text x="${SHEET.margin}" y="${SHEET.margin + SHEET.headerTitleSize + 56}" font-family="${fonts.serif}" font-size="${SHEET.headerBriefSize}" font-style="italic" fill="${ink.muted}">${escapeXml(truncate(page.brief, 130))}</text>`);
  }
  const ruleY = SHEET.margin + SHEET.headerHeight - 26;
  out.push(`<line x1="${SHEET.margin}" y1="${ruleY}" x2="${page.width - SHEET.margin}" y2="${ruleY}" stroke="${ink.rule}" stroke-width="2"/>`);
  for (const cell of page.cells) {
    out.push(
      `<svg x="${cell.artX}" y="${cell.artY}" width="${cell.artW}" height="${cell.artH}" viewBox="0 0 ${cell.art.width} ${cell.art.height}" preserveAspectRatio="none">${artInnerSvg(cell.art)}</svg>`,
    );
    out.push(
      `<rect x="${cell.artX + 0.5}" y="${cell.artY + 0.5}" width="${cell.artW - 1}" height="${cell.artH - 1}" fill="none" stroke="${ink.rule}" stroke-width="1"/>`,
    );
    const textY = cell.artY + cell.artH;
    out.push(`<text x="${cell.artX}" y="${textY + 26}" font-family="${fonts.mono}" font-size="20" font-weight="600" fill="${ink.ink}">${frameNumber(cell.index)}</text>`);
    const tagBits: string[] = [];
    if (cell.shot.length > 0) tagBits.push(cell.shot);
    tagBits.push(`${cell.duration.toFixed(1)}s`);
    out.push(
      `<text x="${cell.artX + 44}" y="${textY + 25}" font-family="${fonts.mono}" font-size="13" fill="${ink.muted}">${escapeXml(tagBits.join(" \u00b7 "))}</text>`,
    );
    cell.captionLines.forEach((line, i) => {
      out.push(
        `<text x="${cell.artX}" y="${textY + 52 + i * SHEET.captionSize * SHEET.captionLineHeight}" font-family="${fonts.mono}" font-size="${SHEET.captionSize}" fill="${ink.muted}">${escapeXml(line)}</text>`,
      );
    });
  }
  const footerY = page.height - SHEET.margin + 8;
  out.push(`<line x1="${SHEET.margin}" y1="${footerY - 26}" x2="${page.width - SHEET.margin}" y2="${footerY - 26}" stroke="${ink.rule}" stroke-width="1"/>`);
  out.push(`<text x="${SHEET.margin}" y="${footerY}" font-family="${fonts.mono}" font-size="14" fill="${ink.muted}">${escapeXml(`CUTROOM - ${truncate(page.title, 48)}`)}</text>`);
  out.push(
    `<text x="${page.width - SHEET.margin}" y="${footerY}" text-anchor="end" font-family="${fonts.mono}" font-size="14" fill="${ink.muted}">${escapeXml(`${page.frameCount} frames \u00b7 sheet ${page.pageIndex + 1}/${page.pageCount}`)}</text>`,
  );
  return out.join("\n");
}

function artInnerSvg(art: { background: string; primitives: Primitive[] }): string {
  const defs: string[] = [];
  const body: string[] = [];
  let clipIndex = 0;
  for (const p of art.primitives) {
    if (p.type === "image") {
      const id = `sheetclip-${clipIndex++}`;
      const { defs: d, body: b } = primitiveToSvg(p, id);
      if (d) defs.push(d);
      if (b) body.push(b);
    } else {
      body.push(primitiveToSvg(p, null).body);
    }
  }
  return [
    defs.length > 0 ? `<defs>${defs.join("")}</defs>` : "",
    `<rect width="100%" height="100%" fill="${art.background}"/>`,
    ...body,
  ].join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function exportSheetSvg(sb: Storyboard, resolve: AssetResolver): number {
  const pages = layoutContactSheet(sb, resolve);
  const slug = slugify(sb.title);
  for (const page of pages) {
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" width="${page.width}" height="${page.height}">`,
      `<rect width="${page.width}" height="${page.height}" fill="${page.paper}"/>`,
      sheetCellSvg(page),
      `</svg>`,
    ].join("\n");
    downloadText(svg, `${slug}-contact-sheet-${pages.length > 1 ? `p${page.pageIndex + 1}-` : ""}${frameCountLabel(sb)}.svg`, "image/svg+xml");
  }
  return pages.length;
}

/** PNG of a single frame's art at 1600px width. */
export async function exportFramePng(sb: Storyboard, frame: Frame, index: number, resolve: AssetResolver): Promise<void> {
  await document.fonts.ready;
  const art = renderFrameArt(frame, sb.aspect, 1600, resolve);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(art.width);
  canvas.height = Math.round(art.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  const images = await loadImages([art]);
  paintArt(ctx, art, images);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${slugify(sb.title)}-frame-${frameNumber(index)}.png`);
}

export function exportProjectJson(sb: Storyboard, assets: Iterable<Asset>): void {
  const text = JSON.stringify(buildProjectFile(sb, assets), null, 2);
  if (new Blob([text]).size > MAX_PROJECT_BYTES) {
    throw new Error("Project JSON is larger than 25 MB. Remove or downscale images and try again.");
  }
  downloadText(text, `${slugify(sb.title)}.cutroom.json`, "application/json");
}

export type ImportResult = ParsedProject;

export async function importStoryboardFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_PROJECT_BYTES) {
    throw new Error(`"${file.name}" is larger than 25 MB. Remove or downscale images and try again.`);
  }
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error(`Could not read "${file.name}".`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`"${file.name}" is not valid JSON: ${err instanceof Error ? err.message : "parse error"}`);
  }
  return parseProjectFile(parsed);
}
