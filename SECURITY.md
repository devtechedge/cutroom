# Security

CUTROOM is a client-only creative tool. There is no server, no account system, and no telemetry: the production build makes zero network calls after load.

## Data handling

- Boards and uploaded images live in the browser's IndexedDB on the visitor's machine. Nothing is synced, uploaded, or transmitted.
- Project JSON export is a plain file download generated locally; import is parsed with `JSON.parse` and rebuilt field-by-field through a whitelist sanitizer, so unknown or hostile keys are dropped rather than executed.
- Uploaded images are stored as data URLs capped at 8 MB each and rendered through SVG image elements. There is no server-side processing anywhere.

## Trust boundaries

- XSS: the app renders via React's default escaping; the only raw attribute rendered from project data is the SVG `href` of an image, which is validated to be a `data:image/` URL on load. Object URLs are revoked after use.
- Injection: imported JSON cannot introduce executable content; colors must match `#rrggbb`, enums are validated against fixed lists, numbers are clamped, strings are length-capped, and object/frame counts are bounded.
- Storage: persistence failures (blocked IndexedDB, quota) degrade to an in-memory session with an explicit banner rather than failing silently.

## Residual risks

- Anyone with access to the visitor's browser profile can read the stored boards; treat IndexedDB as non-confidential local storage and export/delete boards you do not want to keep on a shared machine.
- The dependency tree is audited on the main branch (`npm audit --omit=dev` in CI is advisory; no production server exists to harden).

## Reporting

Open a private security advisory via GitHub ("Report a vulnerability") rather than a public issue.
