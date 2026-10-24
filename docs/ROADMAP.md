# Roadmap

This roadmap orders work by user risk, not by novelty. Items move only when the previous stage has evidence from real boards.

## Shipped

- Local storyboard model with frame composition, timeline rhythm and preview playback.
- Contact sheets in PNG, SVG and print/PDF, plus project JSON with images.
- Board URLs, reload restore, error recovery and unsaved-change protection.
- Multi-select, marquee selection, copy/paste, duplicate and group transform.
- Backup and restore for every active board, recently deleted recovery for 30 days.
- Strict CSP, security headers, CI, Lighthouse budgets and production smoke tests.
- Public welcome, privacy, terms and contact pages.

## Next: sharing without accounts

The next meaningful gap is review. A director can export a sheet, but cannot send a live board.

**Shared review link**

- A read-only snapshot rendered from the same primitive source.
- Expiry measured in days, revocable by the author.
- No editor identity required to view.
- Server stores the snapshot, not the author's browser library.

Prerequisites:

- A small backend with object storage and signed URLs.
- A privacy review that names what a shared snapshot contains.
- A clear "this link is public to anyone who has it" warning before creation.
- Export remains available without sharing.

## Later: version history

Version history starts locally before it becomes a cloud feature.

- Local snapshots on a schedule and before destructive actions.
- A restore flow that previews the difference in frame count and title.
- Cloud history only after accounts exist, with explicit retention.

The design constraint is storage honesty: a browser quota is finite, so history must be prunable and visible in the storage estimate.

## Later: cloud sync

Sync is a different product surface, not a checkbox.

- Accounts and authentication with a real recovery path.
- Conflict handling for two tabs or two devices editing the same board.
- Encryption at rest, with a documented key and deletion story.
- A local-only mode that keeps working when sync is off.
- No silent upload of existing boards. Migration must be opt-in and explained.

## Later: collaboration

Real-time collaboration needs presence, permissions and an audit story.

- Roles: owner, editor, viewer.
- Comments anchored to a frame or object.
- Presence and cursor state over a real-time channel.
- A review mode that does not require an account for the client.
- A migration path from local boards to team spaces with explicit consent.

CRDT or operational transform is an implementation detail, not the plan. The plan is to earn the right to add complexity by proving shared review first.

## Guardrails

- Local composition and export stay free.
- No default telemetry. Any analytics must be opt-in and documented.
- No feature may make existing local boards unreadable without a migration and a backup path.
- Every export format keeps coming from one rendering primitive source.
- A custom domain change needs a migration plan because IndexedDB is origin-scoped. See [DOMAIN.md](DOMAIN.md).

## Explicitly not planned

- A full timeline editor with keyframes and effects.
- A public discovery feed or social network.
- A stock asset marketplace.
- Native mobile apps before the browser experience is strong on a phone.
