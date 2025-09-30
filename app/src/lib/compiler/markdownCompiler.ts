import { normalizeCourse, type RawCourse, type RawCourseItem } from '../normalizeCourse';
import type { Concept, Course } from '../types';
import { slugify } from './slugify';

export interface CompileOptions {
  courseId?: string;
  version?: number;
  defaultLanguage?: string;
}

export interface CompileResult {
  course: Course;
  warnings: string[];
}

export class MarkdownCompileError extends Error {
  readonly messages: string[];

  constructor(messages: string[]) {
    super(messages.join('\n'));
    this.name = 'MarkdownCompileError';
    this.messages = messages;
  }
}

interface ConceptDraft {
  concept: Concept;
  definition?: string;
  itemCount: number;
}

type QuizSection = 'quiz' | 'none';

type ItemCounterKey = `${string}:${string}`;

const MCQ_PATTERN = /^\s*-\s*MCQ:\s*"(.+?)"\s*\|\s*(\[[^\]]*\])\s*\|\s*(\d+)\s*$/i;
const CLOZE_PATTERN = /^\s*-\s*Cloze:\s*(.+)$/i;
const CARD_PATTERN = /^\s*-\s*Card:\s*"(.+?)"\s*\|\s*"(.+?)"\s*$/i;
const MATCH_PATTERN = /^\s*-\s*Match:\s*(\[[^\]]*\])\s*$/i;
const ORDERING_PATTERN = /^\s*-\s*Ordering:\s*(\[[^\]]*\])\s*$/i;
const CONCEPT_HEADER = /^##\s*Concept:\s*(.+?)(?:\s*\(concept_id:\s*([^\s)]+)\))?\s*$/i;

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function nextItemId(conceptId: string, type: string, counters: Map<ItemCounterKey, number>) {
  const base = `${conceptId.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  const key: ItemCounterKey = `${type}:${base}`;
  const index = (counters.get(key) ?? 0) + 1;
  counters.set(key, index);
  return `${type}.${base}.${index}`;
}

export function compileMarkdownCourse(
  markdown: string,
  options: CompileOptions = {},
): CompileResult {
  if (!markdown.trim()) {
    throw new MarkdownCompileError(['The provided markdown is empty.']);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = markdown.split(/\r?\n/);

  let title: string | null = null;
  let description: string | undefined;
  let language: string | undefined;
  let courseTags: string[] | undefined;

  const conceptDrafts: ConceptDraft[] = [];
  const items: RawCourseItem[] = [];
  const counters = new Map<ItemCounterKey, number>();

  let currentConcept: ConceptDraft | null = null;
  let section: QuizSection = 'none';

  const finishDefinition = (draft: ConceptDraft) => {
    if (!draft.definition) return;
    const cardId = nextItemId(draft.concept.id, 'card', counters);
    items.push({
      id: cardId,
      type: 'card',
      conceptIds: [draft.concept.id],
      prompt: draft.concept.name,
      answer: draft.definition,
      metadata: { difficulty: 1 },
    });
    draft.definition = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      section = 'none';
      continue;
    }

    if (line.startsWith('# ')) {
      const header = line.slice(2).trim();
      const [key, ...rest] = header.split(':');
      const value = rest.join(':').trim();
      const normalizedKey = key.toLowerCase();
      switch (normalizedKey) {
        case 'title':
          title = value;
          break;
        case 'description':
          description = value;
          break;
        case 'lang':
        case 'language':
          language = value;
          break;
        case 'tags':
          courseTags = value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
          break;
        default:
          warnings.push(`Unrecognized header directive: ${key}`);
          break;
      }
      continue;
    }

    const conceptMatch = line.match(CONCEPT_HEADER);
    if (conceptMatch) {
      if (currentConcept) {
        finishDefinition(currentConcept);
      }

      const [, conceptName, explicitId] = conceptMatch;
      const conceptId = explicitId?.trim() || `concept.${slugify(conceptName)}`;
      const draft: ConceptDraft = {
        concept: {
          id: conceptId,
          name: conceptName.trim(),
        },
        itemCount: 0,
      };
      conceptDrafts.push(draft);
      currentConcept = draft;
      section = 'none';
      continue;
    }

    if (!currentConcept) {
      warnings.push(`Skipping line outside of a concept block: "${line}"`);
      continue;
    }

    if (line.toLowerCase().startsWith('definition:')) {
      currentConcept.definition = line.slice('definition:'.length).trim();
      continue;
    }

    if (line.toLowerCase().startsWith('tags:')) {
      const tagList = line
        .slice('tags:'.length)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tagList.length) {
        currentConcept.concept.tags = tagList;
      }
      continue;
    }

    if (line.toLowerCase() === 'quiz:') {
      section = 'quiz';
      continue;
    }

    if (section === 'quiz') {
      const mcq = line.match(MCQ_PATTERN);
      if (mcq) {
        const [, stem, rawChoices, correctIndexRaw] = mcq;
        let choices: string[] = [];
        try {
          choices = JSON.parse(rawChoices);
          if (!Array.isArray(choices)) {
            throw new Error('not an array');
          }
        } catch (error) {
          const reason = describeError(error);
          errors.push(`Invalid MCQ choices for concept ${currentConcept.concept.name} (${reason})`);
          continue;
        }

        const correctIndex = Number.parseInt(correctIndexRaw, 10);
        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
          errors.push(`Correct choice index out of bounds for concept ${currentConcept.concept.name}`);
          continue;
        }

        const choiceEntries = choices.map((text, index) => ({
          id: `choice-${index + 1}`,
          text,
          correct: index === correctIndex,
        }));

        const mcqId = nextItemId(currentConcept.concept.id, 'mcq', counters);
        items.push({
          id: mcqId,
          type: 'mcq',
          conceptIds: [currentConcept.concept.id],
          stem,
          choices: choiceEntries,
          metadata: { difficulty: 1 },
        });
        continue;
      }

      const cloze = line.match(CLOZE_PATTERN);
      if (cloze) {
        const [, template] = cloze;
        const clozeId = nextItemId(currentConcept.concept.id, 'cloze', counters);
        items.push({
          id: clozeId,
          type: 'cloze',
          conceptIds: [currentConcept.concept.id],
          template: template.trim(),
          metadata: { difficulty: 2 },
        });
        continue;
      }

      const card = line.match(CARD_PATTERN);
      if (card) {
        const [, prompt, answer] = card;
        const cardId = nextItemId(currentConcept.concept.id, 'card', counters);
        items.push({
          id: cardId,
          type: 'card',
          conceptIds: [currentConcept.concept.id],
          prompt,
          answer,
          metadata: { difficulty: 1 },
        });
        continue;
      }

      const match = line.match(MATCH_PATTERN);
      if (match) {
        const [, payload] = match;
        let rawPairs: string[] = [];
        try {
          rawPairs = JSON.parse(payload);
          if (!Array.isArray(rawPairs)) {
            throw new Error('not an array');
          }
        } catch (error) {
          const reason = describeError(error);
          errors.push(`Invalid match pairs for concept ${currentConcept.concept.name} (${reason})`);
          continue;
        }

        const pairs = rawPairs
          .map((entry, index) => {
            if (typeof entry !== 'string') {
              return null;
            }
            const [prompt, answer] = entry.split(/=>|->|\|/).map((segment) => segment.trim());
            if (!prompt || !answer) {
              return null;
            }
            return {
              id: `pair-${index + 1}`,
              prompt,
              answer,
            };
          })
          .filter(Boolean);

        if (!pairs.length) {
          errors.push(`No valid match pairs for concept ${currentConcept.concept.name}`);
          continue;
        }

        const matchId = nextItemId(currentConcept.concept.id, 'match', counters);
        items.push({
          id: matchId,
          type: 'match',
          conceptIds: [currentConcept.concept.id],
          pairs: pairs as { id: string; prompt: string; answer: string }[],
          metadata: { difficulty: 2 },
        });
        continue;
      }

      const ordering = line.match(ORDERING_PATTERN);
      if (ordering) {
        const [, payload] = ordering;
        let steps: string[] = [];
        try {
          steps = JSON.parse(payload);
          if (!Array.isArray(steps)) {
            throw new Error('not an array');
          }
        } catch (error) {
          const reason = describeError(error);
          errors.push(`Invalid ordering steps for concept ${currentConcept.concept.name} (${reason})`);
          continue;
        }

        if (!steps.length) {
          errors.push(`Ordering exercise requires at least one step for concept ${currentConcept.concept.name}`);
          continue;
        }

        const stepEntries = steps.map((text, index) => ({
          id: `step-${index + 1}`,
          text: String(text),
        }));

        const orderingId = nextItemId(currentConcept.concept.id, 'ordering', counters);
        items.push({
          id: orderingId,
          type: 'ordering',
          conceptIds: [currentConcept.concept.id],
          steps: stepEntries,
          correctOrder: stepEntries.map((step) => step.id),
          metadata: { difficulty: 2 },
        });
        continue;
      }

      warnings.push(`Unrecognized quiz entry: "${line}"`);
      continue;
    }

    warnings.push(`Unrecognized line within concept ${currentConcept.concept.name}: "${line}"`);
  }

  if (currentConcept) {
    finishDefinition(currentConcept);
  }

  if (!title) {
    errors.push('Missing required "# Title:" directive.');
  }

  if (!conceptDrafts.length) {
    errors.push('No concepts were defined. Add at least one "## Concept:" section.');
  }

  if (!items.length) {
    errors.push('No items were generated. Provide definitions or quiz entries.');
  }

  if (errors.length) {
    throw new MarkdownCompileError(errors);
  }

  const rawCourse: RawCourse = {
    id: options.courseId || `authored-${slugify(title!)}`,
    title: title!,
    version: options.version ?? 1,
    lang: language ?? options.defaultLanguage,
    tags: courseTags,
    description,
    concepts: conceptDrafts.map((draft) => draft.concept),
    items,
  };

  return {
    course: normalizeCourse(rawCourse),
    warnings,
  };
}
