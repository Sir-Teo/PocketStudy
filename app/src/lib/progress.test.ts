import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { updateMastery } from './progress';
import type { CardItem } from './types';

const card: CardItem = {
  id: 'card.mastery',
  type: 'card',
  conceptIds: ['concept.mastery'],
  prompt: 'Prompt',
  answer: 'Answer',
};

beforeAll(async () => {
  await db.open();
});

beforeEach(async () => {
  await db.mastery.clear();
});

describe('updateMastery', () => {
  it('raises mastery probability on good grades', async () => {
    const now = Date.UTC(2025, 0, 5);
    await updateMastery([card], 3, now);

    const entry = await db.mastery.get('concept.mastery');
    expect(entry?.lastUpdateTs).toBe(now);
    expect(entry?.probability).toBeCloseTo(0.3, 5);
  });

  it('lowers mastery probability on lapses', async () => {
    const now = Date.UTC(2025, 0, 6);
    await updateMastery([card], 3, now);
    await updateMastery([card], 0, now + 1);

    const entry = await db.mastery.get('concept.mastery');
    expect(entry?.probability).toBeCloseTo(0.2, 5);
  });
});
