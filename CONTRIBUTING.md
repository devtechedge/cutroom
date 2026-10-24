# Contributing

CUTROOM is a client-only storyboard studio. Boards stay in the browser.

## Setup

```bash
npm ci
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run e2e
npm run build
npm run check:csp
```

## Public text

- No em dashes in README, UI copy, release notes, or exported files.
- Do not add AI or model branding.
- Do not claim a feature or a number that is not measured.
- Keep the app client-only: no accounts, no telemetry, no external requests after load.

## Pull requests

- One concern per PR and a clear description.
- Add a regression test for behavior changes.
- Include screenshots for visible changes.
- Keep the production build green and the CSP hashes current.
