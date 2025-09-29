awesome project. here’s a practical, end-to-end roadmap for a lightweight, local, web-based “Duolingo-but-for-anything.” it’s split into phases you can ship incrementally, with concrete data models, APIs, and algorithms you can implement without cloud dependencies.

---

# 0) product slice (what you’ll actually ship first)

**MVP (2–3 weeks)**

* Create courses from simple markdown/CSV.
* Drill sessions with spaced-repetition (FSRS/SM-2).
* Progress/mistake tracking per concept.
* Works fully offline in the browser (Service Worker + IndexedDB).
* Minimal clean UI (keyboard-first, mobile-friendly).

**V1 (4–6 weeks)**

* Course compiler that ingests arbitrary text/notes and auto-generates items.
* Multiple exercise types (MCQ, cloze, pair-matching, ordering, free-response with fuzzy-match).
* Knowledge graph of concepts; adaptive practice that targets weaknesses.
* Import/export user data and courses as a single `.zip`.

**Stretch**

* Audio prompts (TTS) and speech capture (Web Speech API).
* On-device models for classification/lemmatization or offline LLM via LM Studio/Ollama (optional).
* Collaborative course format (PRs on a repo).

---

# 1) architecture overview

**Local-first, single-page app**

* Frontend: React (or Svelte) + TypeScript. Tailwind for speed.
* Persistence: IndexedDB (via Dexie) for user data; course files kept as static JSON under `/courses`.
* Optional backend: tiny Node/Express (or Bun) only for packaging and serving static files; can be skipped with a static host.
* Offline: Service Worker caches app shell + course bundles; background sync to local store.
* Content format: plain JSON/Markdown + YAML headers.

**High-level modules**

* Course Compiler: turns raw inputs → normalized deck of **items** and **concepts**.
* Scheduler: spaced-repetition (FSRS recommended) with daily queues.
* Session Engine: picks items, builds exercises, logs attempts, updates scheduler.
* Progress Engine: mastery estimation per concept; streaks, XP, skill bars.
* UI: Home, Course Browser, Learn, Review, Stats, Settings, Import/Export.
* Storage: `UserState`, `Attempts`, `Schedule`, `ConceptGraph`, `Decks`.

---

# 2) data model (files + IndexedDB)

**Course bundle (JSON)**

```json
{
  "id": "intro_spanish_v1",
  "title": "Intro Spanish",
  "version": 1,
  "lang": "es",
  "concepts": [
    {"id": "greet.hola", "name": "hola", "tags": ["greeting"]},
    {"id": "verb.ser.present", "name": "ser (present)", "tags": ["verb"]}
  ],
  "items": [
    {
      "id": "card.hola.1",
      "concept_ids": ["greet.hola"],
      "type": "card",
      "front": "hola",
      "back": "hello",
      "metadata": {"difficulty": 1}
    }
  ],
  "graphs": {
    "prereq_edges": [["greet.hola","verb.ser.present"]]
  }
}
```

**IndexedDB tables (Dexie)**

* `profiles(id, settings)`
* `schedule(item_id, due_ts, stability, difficulty, reps, lapses, last_grade)`
* `attempts(id, item_id, ts, correctness, latency_ms, prompt_type)`
* `mastery(concept_id, p_mastery, last_update_ts)`
* `courses(id, version, installed_ts)`  // installed/local
* `notes(item_id, text)`  // user annotations

---

# 3) course compiler (from “any content” → learnable items)

**Inputs supported**

* Markdown notes (`### Concept`, bullet examples)
* CSV (Q,A, concept, tags)
* Plain text / PDFs (via client-side extraction)
* Web pages (paste text)

**Pipeline**

1. **Segmentation → Idea Units (IUs)**

   * Rule-based chunking (sentences; headers split; bullet boundaries).
   * Optional NLP: tokenization, NER, phrase mining (use compromise.js or winkNLP for fully in-browser).
2. **Concept detection & mapping**

   * Hash each IU; extract candidate concepts (keywords, patterns, headings).
   * Build `concepts[]` and link IUs → concept_ids.
3. **Item generation**

   * Patterns to create cards:

     * Definition: `term ↔︎ definition`
     * Cloze: mask noun phrases or numbers
     * Pair-match: lists or tables → pairs
     * Ordering: steps in procedures
   * Optional LLM (local) for paraphrase/distractors; otherwise template-based distractors.
4. **QA & normalization**

   * Deduplicate, limit to N items/concept, assign difficulty.
5. **Export `course.json`**

   * Ready to drop into `/courses/<slug>/course.json`.

**Minimal spec for authoring (Markdown)**

```md
# Title: Intro to Economy
# Lang: en
# Tags: econ, basics

## Concept: GDP (concept_id: econ.gdp)
Definition: Gross Domestic Product is ...

Examples:
- The GDP of X is...
Quiz:
- MCQ: "GDP measures ___" | ["total value of goods/services","population","inflation","taxes"] | 0
- Cloze: "{{GDP}} is the total market value ..."
```

A simple parser turns this into the JSON bundle above.

---

# 4) practice & scheduling (FSRS or SM-2)

**Why FSRS**: better retention modeling than SM-2; open formula; works offline.

**Core fields per item**

```
stability, difficulty, retrievability, reps, lapses, last_grade
```

**Review flow (pseudocode)**

```ts
const grade = evaluateAnswer(userAnswer, item); // 0..3 (again, hard, good, easy)
const now = Date.now();
const s0 = item.stability, d0 = item.difficulty;
const {stability, difficulty, intervalDays} = fsrsUpdate(s0, d0, grade, now - lastReview);
item.stability = stability; item.difficulty = difficulty;
item.due_ts = now + daysToMs(intervalDays);
updateConceptMastery(item.concept_ids, grade);
```

**Concept mastery (simple Bayesian estimate)**

```text
p_mastery := Beta(α,β) with α += correct*k, β += wrong*k'
Display as bars on concept map; gate advanced lessons if p_mastery < threshold.
```

---

# 5) session engine & exercise types

**Exercise generators**

* **Card** (type→prompt): forward, reverse
* **MCQ**: 1 correct + 3 distractors (from same concept tag)
* **Cloze**: mask noun phrases/tokens in IU
* **Pair-matching**: 6–12 pairs from same lesson
* **Ordering**: shuffle steps
* **Free-response**: compare with answer using

  * token normalization; Damerau-Levenshtein distance; synonyms table

**Adaptive selection**

* Mix = 70% due reviews, 30% “learn” from weak concepts (lowest `p_mastery`, unseen).
* Limit session to ~10–15 minutes (configurable).

---

# 6) UI/UX blueprint (components)

* `Home`: today’s queue, streak, continue button
* `Courses`: installed courses; import; create new
* `LearnSession`: exercise runner, keyboard shortcuts (1..4 for MCQ, space to flip)
* `LessonView`: concepts, graph, quick practice
* `Stats`: heatmap, retention curve, time spent, mastery per tag
* `Editor`: paste markdown/CSV → preview → compile → install

**Design notes**

* Mobile first: big tap targets, single-column
* Latency target: <16ms interactions (preload next item)
* Dark mode toggle

---

# 7) API surface (if you keep it fully client-only, treat these as service modules)

```
GET  /courses/index.json             // list of installed course manifests
GET  /courses/:id/course.json        // course bundle
POST /import                         // upload .zip or .json → save to IndexedDB
GET  /export                         // stream .zip of user data + courses

// internal services
scheduler.getDue(now): Item[]
scheduler.update(item_id, grade, latency_ms): void
progress.getConceptStats(concept_id): Mastery
compiler.fromMarkdown(md): CourseBundle
```

---

# 8) testing strategy

* **Unit**: scheduler math (deterministic fixtures), parser edge cases.
* **Property tests**: item generator never produces empty prompts; distractor not equal to answer.
* **Integration**: session “playthrough” simulates 100 answers → stable due list growth.
* **Perf**: 10k items, 100k attempts; IndexedDB reads < 50ms per batch.
* **UX**: keyboard navigation paths covered (Tab/Enter/1-4/Space/Esc).

---

# 9) privacy & portability

* No network calls by default.
* Single-file export:

  * `/user/export-YYYYMMDD.zip` containing:

    * `user.json` (profile/settings)
    * `schedule.json`, `attempts.json`, `mastery.json`
    * `courses/<id>/course.json`
* Import respects IDs and versions (migrate if needed).

---

# 10) performance tips

* Precompute and store **distractor pools** per concept tag at install time.
* Keep an **in-memory ring buffer** of the next 5 prompts (warm rendering).
* Use **Web Workers** for compiler and FSRS updates (non-blocking).
* Virtualize large lists (stats, course index).

---

# 11) concrete project skeleton

```
app/
  src/
    index.tsx
    lib/
      db.ts            // Dexie schema
      fsrs.ts          // scheduler math
      scheduler.ts     // due queue + updates
      progress.ts      // mastery updates
      compiler/
        parseMd.ts     // Markdown → IUs
        buildCourse.ts // IUs → bundle
        nlp.ts         // optional light NLP
      exercises/
        buildMCQ.ts
        buildCloze.ts
        matchPairs.ts
        compareFree.ts
    pages/
      Home.tsx
      CourseBrowser.tsx
      Session.tsx
      Stats.tsx
      Editor.tsx
      Settings.tsx
    components/...
    workers/
      compiler.worker.ts
      schedule.worker.ts
    styles/...
  public/
    courses/demo/course.json
    sw.js
  package.json
```

---

# 12) minimal algorithms (drop-in)

**Levenshtein check (free response)**

```ts
import levenshtein from "js-levenshtein";
export function isCorrectFree(text: string, answer: string) {
  const norm = (s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');
  const a = norm(text), b = norm(answer);
  const dist = levenshtein(a,b);
  return dist <= Math.max(1, Math.floor(b.length*0.15));
}
```

**Simple FSRS update (stub you can flesh out)**

```ts
export function fsrsUpdate(stability:number, difficulty:number, grade:0|1|2|3, elapsedDays:number){
  // placeholders—replace with FSRS equations/params
  const d1 = Math.min(3, Math.max(1, difficulty + (grade===3?-0.1:grade===0?+0.15:0)));
  const iDays = Math.max(1, Math.round((stability||1) * (grade===3?2.5:grade===2?2.0:grade===1?1.2:0.5)));
  const s1 = Math.min(3650, (stability||1) * (grade>=2?1.7:0.8) + (grade>=2?1:0));
  return {stability:s1, difficulty:d1, intervalDays:iDays};
}
```

---

# 13) timeline with deliverables

**Week 1**

* Set up project skeleton, Dexie schema, Service Worker.
* Implement course loader; hard-code a demo course.

**Week 2**

* Session Engine with MCQ + Card + FSRS updates.
* Stats: due count, streak, session length.

**Week 3**

* Import/export (.json); concept mastery; cloze questions.

**Week 4**

* Course Compiler (Markdown → JSON) with rule-based segmentation.
* Editor page: paste markdown → preview → install.

**Week 5**

* Pair-matching & ordering exercises; distractor pools.
* Knowledge graph view; adaptive practice by weak concepts.

**Week 6**

* Robustness: tests, perf, large decks; polish mobile UX.
* Package v1; create 2 example courses (language + non-language).

**Stretch (7–8)**

* Audio (TTS), speech input, offline LLM integration.

---

# 14) “learn anything” examples

* **Language**: term↔definition, cloze in example sentences, audio prompts.
* **Finance**: formulas as concepts; cloze on definitions; ordering for calculation steps.
* **CS/Math**: theorem→name, code snippets with masked tokens; pair-match complexity ↔ notation.
* **Medical**: symptom↔condition pairs; ordering for protocols; image-to-label (later with on-device model).

---

# 15) definition of done (MVP)

* Install app, turn off Wi-Fi, still: load, review, update schedule, stats update.
* Add a new course via Markdown paste → compiled → immediately learnable.
* Export/import preserves XP, mastery, and due queue.
* Lighthouse PWA score ≥ 90; cold start < 2s; interaction < 16ms.

