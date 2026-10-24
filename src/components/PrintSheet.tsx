import { useMemo, type JSX } from "react";
import { layoutContactSheet, sheetInk } from "../export/contactsheet";
import { frameNumber } from "../model/geometry";
import type { Storyboard } from "../model/types";
import type { AssetResolver } from "../render/primitives";
import { FrameArtView } from "./FrameView";
import { Icon } from "./Icon";

export interface PrintSheetProps {
  project: Storyboard;
  resolve: AssetResolver;
  onBack: () => void;
}

/**
 * Print-first contact sheet. The browser print dialog supplies the PDF path,
 * so the page keeps one layout source (contactsheet.ts) with the PNG and SVG
 * exports.
 */
export function PrintSheet({ project, resolve, onBack }: PrintSheetProps): JSX.Element {
  const pages = useMemo(() => layoutContactSheet(project, resolve), [project, resolve]);
  const ink = sheetInk(project.paper);

  return (
    <div className="print-shell">
      <header className="print-toolbar">
        <button type="button" className="btn small" onClick={onBack}>
          <Icon name="move-left" size={14} />
          Back to board
        </button>
        <span className="print-toolbar-title">
          <strong>{project.title}</strong>
          <span className="mono">
            {project.frames.length} frame{project.frames.length === 1 ? "" : "s"} · {pages.length} page{pages.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className="header-spacer" />
        <span className="print-hint mono">Choose Save as PDF in the print dialog</span>
        <button type="button" className="btn primary" onClick={() => window.print()}>
          <Icon name="download" size={14} />
          Print / save as PDF
        </button>
      </header>

      <main className="print-sheets">
        {pages.map((page) => (
          <section
            key={page.pageIndex}
            className="print-page"
            style={{ background: page.paper, color: ink.ink }}
            aria-label={`Contact sheet page ${page.pageIndex + 1} of ${page.pageCount}`}
          >
            <header className="print-page-head">
              <h1>{page.title}</h1>
              <p className="mono" style={{ color: ink.muted }}>
                {page.meta}
              </p>
              {page.brief.length > 0 && <p className="print-brief">{page.brief}</p>}
            </header>

            <div className="print-grid" style={{ gridTemplateColumns: `repeat(${page.cols}, minmax(0, 1fr))` }}>
              {page.cells.map((cell) => {
                const frame = project.frames[cell.index];
                return (
                  <figure key={cell.index} className="print-cell">
                    <div className="print-art" style={{ borderColor: ink.rule }}>
                      <FrameArtView frame={frame} aspect={project.aspect} resolve={resolve} title={`Frame ${frameNumber(cell.index)}`} />
                    </div>
                    <figcaption>
                      <span className="print-cell-number mono">{frameNumber(cell.index)}</span>
                      <span className="print-cell-tags mono" style={{ color: ink.muted }}>
                        {cell.shot ? `${cell.shot} · ` : ""}
                        {cell.duration.toFixed(1)}s
                      </span>
                      {cell.captionLines.length > 0 && (
                        <span className="print-cell-caption mono" style={{ color: ink.muted }}>
                          {cell.captionLines.map((line, i) => (
                            <span key={i}>{line}</span>
                          ))}
                        </span>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>

            <footer className="print-page-foot mono" style={{ color: ink.muted, borderColor: ink.rule }}>
              <span>CUTROOM · {page.title}</span>
              <span>
                {page.frameCount} frames · sheet {page.pageIndex + 1}/{page.pageCount}
              </span>
            </footer>
          </section>
        ))}
      </main>
    </div>
  );
}
