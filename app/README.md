# PocketStudy

PocketStudy is a local-first study companion you can run entirely in the browser. It ships as a React + TypeScript single-page app, persists learner data with Dexie (IndexedDB), and stays available offline via a lightweight service worker.

## Current Capabilities

- Installs a bundled "Learning How to Learn" demo course on first run and seeds its schedule locally.
- Runs a mixed drill session (flashcards, multiple choice, cloze) with manual grading buttons mapped to FSRS-style scheduling updates (`src/lib/fsrs.ts`).
- Supports additional drill types (pair matching, ordering) and adaptively pulls in weak concepts for targeted practice.
- Builds tag-aware distractor pools for MCQs and surfaces concept dependencies in the Knowledge Graph view (`src/pages/KnowledgeGraph.tsx`).
- Ships with two offline-ready example courses (learning science + meta-habits) to showcase language and non-language content.
- Tracks attempts, due queues, concept mastery, installed courses, and profile settings in IndexedDB via `PocketStudyDB` (`src/lib/db.ts`).
- Calculates daily streaks, due counts, and recent activity on the Home and Stats views using live Dexie queries.
- Lets you install/remove course bundles from `/public/courses` through the Course Browser page (`src/pages/CourseBrowser.tsx`).
- Exports and restores progress via JSON backups from the Settings page (`src/pages/Settings.tsx`).
- Compiles Markdown authoring input into full course bundles and installs them locally via the in-app editor (`src/pages/Editor.tsx`).
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
- **UI Surfaces:** Home (streak + CTA), Learn (session loop), Courses (install/remove), Stats (attempt log), Settings (profile + backups), Editor (Markdown → bundle compiler). `components/GradeButtons.tsx` controls the manual grading flow.
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
- Component tests exercise the App shell, key pages (Home, Stats, Knowledge Graph), and the `useCourse` data hook for higher coverage.
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
- ✅ **Week 3** goals complete: concept mastery tracking, JSON backup import/export, and templated cloze authoring for cloze cards.
- ✅ **Week 4** goals complete: Markdown course compiler, on-device authoring UI, and install pipeline for generated bundles.
- ✅ **Week 5** goals complete: pair matching + ordering exercises, adaptive queueing, tag-based MCQ distractors, and knowledge graph visualisation.
- ✅ **Week 6** goals complete: broader test suite coverage, dual example courses, mobile polish, and an upgraded offline caching strategy.

## Next Steps

1. Add background sync for queued exports/imports and run automated Lighthouse checks to lock in ≥90 PWA scores.
2. Package exports as `.zip` bundles alongside course assets for the longer-term V1 milestone.
3. Extend adaptive targeting with configurable session mixes and polish the pair-matching interaction.
4. Explore stretch goals (audio prompts, offline NLP) once the polish backlog is clear.

See `roadmap.md` for the detailed phased plan and algorithm notes.
