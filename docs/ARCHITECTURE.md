# Architecture

CUTROOM is a Vite 7 + React 19 single-page app with no backend.

## Rendering

`src/render/primitives.ts` is the one visual source. The live stage, thumbnails, preview, PNG canvas and SVG strings all consume the same primitives.

## State and persistence

`src/model` holds the width-normalized storyboard. `src/state/history.ts` provides labelled undo and redo; `src/state/editor.tsx` tracks a frame and an ordered object selection so group operations keep one history entry. `src/persist/db.ts` wraps IndexedDB version 2 with a memory fallback, storing active projects in `projects`, image assets in `assets`, and recoverable boards in `trash`. Assets are data URLs capped at 8 MB and 4096 px. Deleted boards stay in `trash` for 30 days; startup purges expired records and then removes images referenced by neither active nor recoverable boards.

## Project files

`src/export/projectfile.ts` writes schema v2: the storyboard plus only the referenced image assets. Imports sanitize every field, remap asset IDs, report fixes, and keep v1 files readable with a missing-image warning. `src/export/backup.ts` wraps several project files in a `cutroom-backup` document for whole-library backup and restore.

## Routing

Hash routes: `#/` for the gallery, `#/board/<id>` for a board, `#/print/<id>` for the print/PDF sheet, `#/welcome` for the product page, and `#/privacy`, `#/terms`, `#/contact` for public pages. The app syncs `hashchange` and `popstate`, restores the board on reload, and falls back to the gallery for missing IDs.

## Exports

Contact sheets are deterministic. Multi-page sheets download as one ZIP. PNG exports wait for fonts. SVG output escapes every attribute and contains no em dashes. The print route reuses the contact-sheet page layout and the live SVG renderer; the browser print dialog supplies the PDF.

## Editing

The stage supports drag, resize, keyboard nudging, marquee selection, shift-click additive selection, copy/paste, duplicate and group transforms. Group geometry is written through `ops.updateObjects` so one pointer movement cannot fan out into separate object commits.

## Security

No accounts and no network calls at runtime. `vercel.json` sets a strict CSP and security headers. Inline scripts are allowed by SHA-256 hash, and `scripts/check-csp.mjs` verifies the built HTML against the policy.

## Testing

- `npm run test:coverage`: unit coverage for the model, export, render and history core.
- `npm run e2e`: Playwright journeys including axe, JSON round trips, SVG validity, theme boot and focus behavior.
- `e2e/visual.spec.ts`: Linux pixel baselines for the stage, print sheet and welcome hero, refreshed through the Visual baselines workflow.
- `npm run build && npm run check:csp`: production build and CSP hash check.
