# PocketStudy

PocketStudy is a local-first, browser-only study companion inspired by Duolingo. The app ships as a React + TypeScript single-page experience that keeps learner data in IndexedDB so everything works offline.

## Current Status

- Core SPA scaffold is in place with Vite, React, and Dexie-backed persistence.
- Demo course bundle installs on first launch and feeds the session loop.
- Session engine supports flashcards, multiple choice, and cloze prompts with FSRS-style scheduling updates.
- Home, course browser, and stats views surface due counts, streak guidance, and recent activity.
- Import/export of user state, the Markdown-driven course compiler, and the offline service worker are still pending.

## Roadmap Alignment

We are effectively at the close of **Week 2** on the roadmap: the skeleton, Dexie schema, and demo loader are done (Week 1 goals), and the session engine plus basic stats are up and running (Week 2 goals). Work not yet started corresponds to Week 3 and beyond (import/export, concept mastery UI refinements, compiler tooling, advanced exercise types, service worker polish).

## Getting Started

```bash
cd app
npm install
npm run dev
```

The Vite dev server runs on <http://localhost:5173>. Add the `--host` flag when running E2E tests so Playwright can reach the server from its worker processes.

## Testing

```bash
cd app
npm run test        # unit tests (Vitest)
npm run test:e2e    # Playwright tests
```

Playwright will install browser binaries the first time you run the E2E suite.

## Next Milestones

1. Implement import/export flows for user progress and installed courses.
2. Add an offline service worker with background sync for schedules and bundles.
3. Build the Markdown → course compiler and on-device authoring experience.
4. Expand exercise types (pair matching, ordering) and adaptive practice powered by concept mastery.
