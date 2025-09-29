# PocketStudy

A lightweight, local-first study companion inspired by Duolingo. The MVP ships a React + TypeScript single-page app that runs fully in the browser with IndexedDB persistence, spaced repetition scheduling, and a starter course.

## Features

- Local Dexie database for attempts, schedule, mastery, and installed courses
- FSRS-style spaced repetition updates with manual grading
- Demo course bundle (`public/courses/demo/course.json`) auto-installed on first launch
- Session flow with cards, multiple choice, and cloze prompts
- Course browser to install or remove local course bundles
- Home dashboard with due count and streak estimation
- Stats overview with recent review history

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on <http://localhost:5173>. Because the app reads static course bundles from `public/courses`, run the dev server with `--host` when using Playwright e2e tests.

## Testing

### Unit tests

```bash
npm run test        # single run
npm run test:watch  # watch mode
npm run test:ui     # Vitest UI
```

Tests use Vitest with jsdom, React Testing Library, and coverage reports via `@vitest/coverage-v8`.

### End-to-end tests

```bash
npx playwright install
npm run test:e2e
```

End-to-end tests live in `tests/e2e` and rely on Playwright. The Playwright config starts the Vite dev server automatically.

## Project Structure

```
src/
  lib/          // domain logic (db, scheduler, session queue, etc.)
  pages/        // top-level routes
  components/   // shared UI building blocks
  hooks/        // React hooks
  workers/      // reserved for future background workers
public/
  courses/      // bundled course metadata and items
```

## Next Steps

- Expand exercise types with interactive MCQs and validation
- Implement import/export of user state
- Add offline service worker with background sync
- Build Markdown → course compiler and on-device authoring tools
