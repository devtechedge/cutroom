# Changelog

## v1.2.0 (2026-10-24)

### Added

- Multi-select on the stage with shift-click, marquee selection, group move, group nudge and batch delete.
- Copy, paste and duplicate for selected objects, with undo history kept as one group action.
- Print route at `#/print/<id>` for a print-ready contact sheet and PDF through the browser print dialog.
- Whole-library backup and restore as a validated JSON file.
- A 30-day Recently deleted bin with restore and permanent delete.
- A backup reminder when boards exist and no backup has been downloaded.
- Public pages for welcome, privacy, terms and contact, plus a product and roadmap doc set.
- A custom domain migration plan that accounts for origin-scoped IndexedDB.
- Linux pixel baselines for the stage, print sheet and welcome page, with a workflow to refresh them.

### Changed

- Board deletion moves boards to Recently deleted instead of removing them immediately.
- Storage moved to IndexedDB version 2 with a trash store. Existing databases upgrade in place.
- The gallery footer links to the public pages and the source repository.

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
