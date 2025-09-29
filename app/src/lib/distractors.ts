import type { CardItem, Course, McqItem } from './types';

function conceptTagsFor(item: { conceptIds: string[] }, conceptTagMap: Map<string, string[]>) {
  const tags = new Set<string>();
  for (const conceptId of item.conceptIds) {
    const tagList = conceptTagMap.get(conceptId);
    if (tagList) {
      for (const tag of tagList) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags);
}

function addToPool(map: Map<string, Set<string>>, tags: string[], value: string) {
  for (const tag of tags) {
    if (!map.has(tag)) {
      map.set(tag, new Set<string>());
    }
    map.get(tag)?.add(value);
  }
}

export function augmentMcqDistractors(course: Course): Course {
  const conceptTagMap = new Map(course.concepts.map((concept) => [concept.id, concept.tags ?? []]));
  const conceptNames = course.concepts.map((concept) => concept.name).filter(Boolean);
  const poolByTag = new Map<string, Set<string>>();
  const generalPool = new Set<string>();

  const registerAnswer = (tags: string[], value: string) => {
    if (!value) return;
    addToPool(poolByTag, tags, value);
    generalPool.add(value);
  };

  for (const item of course.items) {
    const tags = conceptTagsFor(item, conceptTagMap);
    if (item.type === 'mcq') {
      for (const choice of item.choices) {
        registerAnswer(tags, choice.text);
      }
    } else if (item.type === 'card') {
      registerAnswer(tags, (item as CardItem).answer);
    }
  }

  const augmentedItems = course.items.map((item) => {
    if (item.type !== 'mcq') {
      return item;
    }
    const mcqItem = item as McqItem;
    const tags = conceptTagsFor(mcqItem, conceptTagMap);
    const existing = new Set(mcqItem.choices.map((choice) => choice.text));
    const choices = [...mcqItem.choices];

    const needed = Math.max(0, 4 - choices.length);
    if (needed === 0) {
      return mcqItem;
    }

    const candidates: string[] = [];
    for (const tag of tags) {
      const pool = poolByTag.get(tag);
      if (!pool) continue;
      for (const value of pool) {
        if (!existing.has(value)) {
          candidates.push(value);
        }
      }
    }

    for (const value of generalPool) {
      if (!existing.has(value)) {
        candidates.push(value);
      }
    }

    let counter = choices.length + 1;
    for (const value of candidates) {
      if (choices.length >= 4) break;
      if (existing.has(value)) continue;
      choices.push({ id: `choice-${counter}`, text: value });
      existing.add(value);
      counter += 1;
    }

    if (choices.length < 4) {
      for (const name of conceptNames) {
        if (choices.length >= 4) break;
        if (existing.has(name)) continue;
        choices.push({ id: `choice-${counter}`, text: name });
        existing.add(name);
        counter += 1;
      }
    }

    while (choices.length < 4) {
      const fallback = `Option ${counter}`;
      if (!existing.has(fallback)) {
        choices.push({ id: `choice-${counter}`, text: fallback });
        existing.add(fallback);
      }
      counter += 1;
    }

    return { ...mcqItem, choices } satisfies McqItem;
  });

  return {
    ...course,
    items: augmentedItems,
  };
}
