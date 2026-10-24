# Custom domain migration

CUTROOM currently lives at `https://cutroom-green.vercel.app`. Moving to a custom domain is safe for the code but not invisible for users: IndexedDB and localStorage are keyed by origin, so a new domain starts with an empty library.

No custom domain is configured in this repository today. This document is the plan to follow before one is added.

## Why the origin matters

- Boards, images and the trash store live in IndexedDB under the current origin.
- Theme and backup reminders live in localStorage under the current origin.
- A browser will not let one origin read another origin's database.
- Redirects move the page, not the stored data.

A redirect from the old domain therefore opens the app with no boards. Users must export a backup from the old origin and restore it on the new one.

## Migration checklist

1. **Announce before switching.** Put a notice in the app and the README at least one release before the change.
2. **Add a migration route on the old origin.** Keep serving the app at the old origin long enough for users to download a backup. Do not redirect the root immediately.
3. **Export from the old origin.** Use Back up all. The backup contains every active board and its images. Boards in Recently deleted are intentionally excluded.
4. **Restore on the new origin.** Open Restore backup and choose the file. Restoring does not overwrite existing boards: ID collisions are regenerated.
5. **Verify one board with images.** Open it, check the stage, and export a contact sheet.
6. **Redirect after the migration window.** Only then redirect the old origin to the new one. Keep the migration page reachable for late visitors.
7. **Keep the old deployment available.** Do not delete the Vercel project while users may still hold old-origin data.

## Vercel steps

1. Add the domain in the Vercel project settings and follow the DNS instructions.
2. Keep the existing `*.vercel.app` production alias active.
3. Set the canonical URL in `index.html`, `public/sitemap.xml`, `public/robots.txt` and the Open Graph URLs to the new domain in the same release that enables it.
4. Update `vercel.json` only if the CSP or headers need the new origin. The current policy is self-only, so no allowlist change is expected.
5. Confirm `npm run check:csp`, the production smoke workflow and the Lighthouse workflow after the switch.

## Rollback

If the domain is misconfigured, remove it from the Vercel project and keep the old alias as the canonical origin. Because the app is client-only, no server data migration is involved. Users who already restored a backup on the new origin keep working there; they can export from the new origin and restore on the old one if needed.

## What must not happen

- Silently redirecting the old origin before users can export.
- Claiming that boards "move automatically" across origins.
- Reusing the same database name while assuming it follows the domain.
- Changing the canonical URL in search metadata before the new domain serves the app.
