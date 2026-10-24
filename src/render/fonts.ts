import type { FontChoice } from "../model/types";

/** Stacks shared by the DOM stage, the canvas exporter, and SVG exports. */
export const FONT_STACKS: Record<FontChoice, string> = {
  grotesk: '"Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif',
  serif: '"Source Serif 4 Variable", "Source Serif 4", Georgia, serif',
  mono: '"IBM Plex Mono", ui-monospace, "Cascadia Mono", Menlo, monospace',
};

export const UI_FONT = '"Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif';
export const UI_SERIF = '"Source Serif 4 Variable", "Source Serif 4", Georgia, serif';
export const UI_MONO = '"IBM Plex Mono", ui-monospace, "Cascadia Mono", Menlo, monospace';
