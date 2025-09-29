import { buildClozeFromTemplate, normalizeClozeItem } from './cloze';
import type {
  CardItem,
  ClozeItem,
  ClozeToken,
  Course,
  CourseItem,
  MatchItem,
  McqItem,
  OrderingItem,
} from './types';

export interface RawClozeItem
  extends Omit<ClozeItem, 'tokens' | 'answer'> {
  tokens?: ClozeToken[];
  answer?: string[];
  template?: string;
}

export type RawCourseItem = CourseItem | (Omit<ClozeItem, 'tokens' | 'answer'> & {
  tokens?: ClozeToken[];
  answer?: string[];
  template?: string;
});

export type RawCourse = Omit<Course, 'items'> & {
  items: RawCourseItem[];
};

function normalizeCloze(raw: RawClozeItem): ClozeItem {
  const { template, tokens, answer, ...rest } = raw;
  if (template) {
    const built = buildClozeFromTemplate(template);
    return normalizeClozeItem({
      ...rest,
      type: 'cloze',
      tokens: built.tokens,
      answer: built.answers,
    });
  }

  if (!tokens || !answer) {
    throw new Error(`Cloze item ${raw.id} must include tokens/answer or a template`);
  }

  return normalizeClozeItem({
    ...rest,
    type: 'cloze',
    tokens,
    answer,
  });
}

export function normalizeCourse(raw: RawCourse): Course {
  const items = raw.items.map((item) => {
    if (item.type === 'cloze') {
      return normalizeCloze(item as RawClozeItem);
    }
    return item as CardItem | McqItem | MatchItem | OrderingItem;
  });

  return {
    ...raw,
    items,
  } satisfies Course;
}
