import { ASPECT_VALUE, frameNumber } from "../model/geometry";
import { renderFrameArt, type AssetResolver, type FrameArt } from "../render/primitives";
import type { Storyboard } from "../model/types";

export const SHEET = {
  pageWidth: 1560,
  margin: 72,
  gutter: 40,
  rowGap: 30,
  headerTitleSize: 42,
  headerMetaSize: 15,
  headerBriefSize: 15,
  headerHeight: 148,
  footerHeight: 58,
  textBlockHeight: 88,
  captionSize: 15,
  captionLineHeight: 1.45,
  captionMaxLines: 2,
  /** IBM Plex Mono advance width per em. */
  monoEm: 0.6,
} as const;

export interface SheetCell {
  index: number;
  art: FrameArt;
  artX: number;
  artY: number;
  artW: number;
  artH: number;
  shot: string;
  duration: number;
  captionLines: string[];
}

export interface SheetPage {
  width: number;
  height: number;
  title: string;
  meta: string;
  brief: string;
  author: string;
  paper: string;
  cells: SheetCell[];
  pageIndex: number;
  pageCount: number;
  frameCount: number;
}

/** Greedy word wrap against a measured-mono width; ends with an ellipsis. */
export function wrapMonoCaption(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const charW = SHEET.monoEm * fontSize;
  const maxChars = Math.max(8, Math.floor(maxWidth / charW));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current.length > 0) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars - 1) + "\u2026" : word;
      if (lines.length === maxLines) break;
    }
  }
  if (current.length > 0 && lines.length < maxLines) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  const joined = lines.join(" ");
  if (words.join(" ").length > joined.length && lines.length === maxLines && !lines[maxLines - 1].endsWith("\u2026")) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(0, maxChars - 1)) + "\u2026";
  }
  return lines;
}

function columnsFor(count: number): number {
  if (count <= 4) return 2;
  if (count <= 12) return 3;
  return 4;
}

/** Deterministic multi-page contact-sheet layout for a storyboard. */
export function layoutContactSheet(sb: Storyboard, resolve: AssetResolver): SheetPage[] {
  const cols = columnsFor(sb.frames.length);
  const perPage = cols * 2;
  const artW = (SHEET.pageWidth - SHEET.margin * 2 - SHEET.gutter * (cols - 1)) / cols;
  const artH = artW / ASPECT_VALUE[sb.aspect];
  const cellH = artH + SHEET.textBlockHeight;
  const pageCount = Math.max(1, Math.ceil(sb.frames.length / perPage));
  const metaBits = [sb.aspect, `${sb.frames.length} frame${sb.frames.length === 1 ? "" : "s"}`];
  if (sb.author.trim().length > 0) metaBits.push(`Board by ${sb.author.trim()}`);
  const meta = metaBits.join("  \u00b7  ");
  const pages: SheetPage[] = [];
  for (let p = 0; p < pageCount; p++) {
    const pageFrames = sb.frames.slice(p * perPage, (p + 1) * perPage);
    const rows = Math.ceil(pageFrames.length / cols);
    const height = SHEET.margin + SHEET.headerHeight + rows * cellH + (rows - 1) * SHEET.rowGap + SHEET.margin + SHEET.footerHeight;
    const cells: SheetCell[] = pageFrames.map((frame, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const artX = SHEET.margin + col * (artW + SHEET.gutter);
      const artY = SHEET.margin + SHEET.headerHeight + row * (cellH + SHEET.rowGap);
      const caption = frame.caption.visible && frame.caption.text.trim().length > 0 ? frame.caption.text.trim() : "";
      return {
        index: p * perPage + i,
        art: renderFrameArt(frame, sb.aspect, artW, resolve),
        artX,
        artY,
        artW,
        artH,
        shot: frame.shot,
        duration: frame.duration,
        captionLines: caption.length > 0 ? wrapMonoCaption(caption, artW, SHEET.captionSize, SHEET.captionMaxLines) : [],
      };
    });
    pages.push({
      width: SHEET.pageWidth,
      height,
      title: sb.title,
      meta,
      brief: sb.brief.trim(),
      author: sb.author.trim(),
      paper: sb.paper,
      cells,
      pageIndex: p,
      pageCount,
      frameCount: sb.frames.length,
    });
  }
  return pages;
}

export function sheetCellLabel(index: number): string {
  return frameNumber(index);
}
