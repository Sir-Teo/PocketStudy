# PocketStudy

PocketStudy is a local-first study companion you can run entirely in the browser. It ships as a React + TypeScript single-page app, persists learner data with Dexie (IndexedDB), and stays available offline via a lightweight service worker.

## Current Capabilities

- Installs a bundled "Learning How to Learn" demo course on first run and seeds its schedule locally.
- Runs a mixed drill session (flashcards, multiple choice, cloze) with manual grading buttons mapped to FSRS-style scheduling updates (`src/lib/fsrs.ts`).
- Tracks attempts, due queues, concept mastery, installed courses, and profile settings in IndexedDB via `PocketStudyDB` (`src/lib/db.ts`).
- Calculates daily streaks, due counts, and recent activity on the Home and Stats views using live Dexie queries.
- Lets you install/remove course bundles from `/public/courses` through the Course Browser page (`src/pages/CourseBrowser.tsx`).
- Registers a service worker (`public/sw.js`) that caches the app shell and course bundles for offline use.
- Provides Vitest coverage of scheduler, mastery, evaluation, and UI grading logic; Playwright is wired for end-to-end sessions.

## Architecture Overview

- **Frameworks:** Vite + React 19 with React Router 7 for routing and React Query for async data orchestration.
- **Persistence:** Dexie wraps IndexedDB, exposing tables for schedule, attempts, mastery, profiles, and installed courses. Tests rely on `fake-indexeddb` to mirror this storage in Node.
- **Domain modules (`src/lib/`):**
  - `db.ts` defines the Dexie schema used throughout the app.
  - `courseLoader.ts` & `courseService.ts` fetch, cache, and install course bundles. Installations seed the spaced-repetition schedule while running inside a Dexie transaction.
  - `fsrs.ts` and `scheduler.ts` implement the review algorithm (grade → difficulty/stability adjustments) and record attempts.
  - `progress.ts` updates concept mastery probabilities per review; `sessionQueue.ts` stitches together schedule entries with the relevant course items at run time.
  - `evaluate.ts` provides basic answer normalization for free-response checks.
- **UI Surfaces:** Home (streak + CTA), Learn (session loop), Courses (install/remove), Stats (attempt log), Settings (daily goal stub awaiting persistence). `components/GradeButtons.tsx` controls the manual grading flow.
- **Offline:** `src/swRegistration.ts` conditionally registers `public/sw.js`, which precaches the shell and serves cached assets while updating on the fly.

## Data Model

**IndexedDB tables (Dexie schema)**

- `schedule` — spaced repetition metadata per item (`itemId`, `courseId`, `dueTs`, `stability`, `difficulty`, `reps`, `lapses`, `lastGrade`).
- `attempts` — history of reviews with timestamp and grade to drive streaks and stats.
- `mastery` — probability estimates per concept, updated by `updateMastery`.
- `courses` — installed bundle metadata (`id`, `version`, `title`, `installedTs`).
- `profiles` — currently just the default learner profile and settings.

**Course bundles (`public/courses/<id>/course.json`)**

Each bundle defines `concepts`, `items` (card/mcq/cloze), optional graph edges, and metadata. The demo course illustrates the expected structure with IDs that line up against schedule entries and mastery tracking.

## Development Workflow

Requirements: Node 20+ and npm.

```bash
cd app
npm install
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # Type-check + production build
npm run preview      # Serve the production build locally
```

React Query caches course fetches; if you tweak course JSON while the dev server is running, refresh with `Cmd/Ctrl+Shift+R` to bust the service worker cache.

## Testing

```bash
npm run test         # Vitest unit suite
npm run test:watch   # Watch mode with jsdom
npm run test:ui      # Vitest UI runner
npm run test:e2e     # Playwright end-to-end drills
```

- Unit tests cover FSRS updates, schedule seeding/recording, mastery progression, free-response normalization, and the grading buttons UI.
- `tests/e2e` houses Playwright flows; the config spins up Vite automatically and expects the dev server to run with `--host` when executing inside CI containers.

## Project Structure

```
app/
  public/
    courses/           # Bundle index + demo course JSON
    sw.js              # App-shell service worker
  src/
    components/        # UI widgets (GradeButtons)
    hooks/             # React Query hooks (e.g., useCourse)
    lib/               # Domain logic: Dexie schema, scheduler, mastery, etc.
    pages/             # Route-level screens (Home, Session, Stats...)
    styles/            # Global stylesheets
    swRegistration.ts  # Registers the service worker in production
    main.tsx           # App bootstrap with React Query + Router providers
```

## Roadmap Alignment

Comparing to `roadmap.md`:

- ✅ **Week 1** goals complete: Vite scaffold, Dexie schema, demo course loader, service worker scaffold.
- ✅ **Week 2** goals complete: session engine with card/MCQ/cloze prompts, FSRS-style grading, due-count and streak stats.
- 🔄 **Week 3** in progress: concept mastery is tracked, but import/export flows and richer cloze authoring still remain.
- ⏭️ Weeks 4+ (Markdown compiler, adaptive practice, additional exercise types, graph visualizations) have not started.

## Next Steps

1. Build import/export of user progress and installed courses (aligns with Week 3 deliverables).
2. Flesh out the Markdown → course compiler and on-device authoring UI (Week 4).
3. Expand exercise coverage (pair matching, ordering) and adaptive session targeting using `mastery` (Week 5).
4. Harden offline behavior: background sync, smarter cache busting, and full PWA Lighthouse pass (Week 6).

See `roadmap.md` for the detailed phased plan and algorithm notes.
