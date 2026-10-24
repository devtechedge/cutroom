# Architecture

CUTROOM is a Vite 7 + React 19 single-page app with no backend.

## Rendering

`src/render/primitives.ts` is the one visual source. The live stage, thumbnails, preview, PNG canvas and SVG strings all consume the same primitives.

## State and persistence

`src/model` holds the width-normalized storyboard. `src/state/history.ts` provides labelled undo and redo. `src/persist/db.ts` wraps IndexedDB with a memory fallback. Assets are data URLs capped at 8 MB and 4096 px.

## Project files

`src/export/projectfile.ts` writes schema v2: the storyboard plus only the referenced image assets. Imports sanitize every field, remap asset IDs, report fixes, and keep v1 files readable with a missing-image warning.

## Routing

Hash routes: `#/` for the gallery and `#/board/<id>` for a board. The app syncs `hashchange` and `popstate`, restores the board on reload, and falls back to the gallery for missing IDs.

## Exports

Contact sheets are deterministic. Multi-page sheets download as one ZIP. PNG exports wait for fonts. SVG output escapes every attribute and contains no em dashes.

## Security

No accounts and no network calls at runtime. `vercel.json` sets a strict CSP and security headers. Inline scripts are allowed by SHA-256 hash, and `scripts/check-csp.mjs` verifies the built HTML against the policy.

## Testing

- `npm run test:coverage`: unit coverage for the model, export, render and history core.
- `npm run e2e`: Playwright journeys including axe, JSON round trips, SVG validity, theme boot and focus behavior.
- `npm run build && npm run check:csp`: production build and CSP hash check.
