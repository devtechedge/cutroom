# Changelog

## v1.1.0 (2026-10-24)

### Added

- Board URLs at `#/board/<id>`, reload restore, browser Back and per-board titles.
- Error boundary, boot recovery, unsaved-change warning and a two-tab notice.
- Lazy-loaded editor chunk.
- Multi-page contact sheets download as one ZIP.
- Image dimension cap with downscaling.
- CSP, security headers, robots, sitemap, web manifest, canonical, image alt text and JSON-LD.
- Coverage thresholds, Lighthouse budget and a production smoke workflow.
- Contributor docs, issue forms, CODEOWNERS, architecture notes and ADR 0001.

### Fixed

- Project JSON carries image assets; oversized files are rejected with the right message.
- SVG contact sheets are valid XML and contain no U+2014.
- Theme is applied before first paint.
- Delete-all no longer reseeds starters.
- Duplicate object IDs are regenerated on import.
- Non-Latin board titles keep their filename characters.
- Menu names, focus return, contrast, landmarks and target sizes.

## v1.0.0 (2026-10-24)

- Initial public release of CUTROOM.
