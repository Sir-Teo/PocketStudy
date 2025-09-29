import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { installCompiledCourse } from './courseService';
import { getDueQueue } from './sessionQueue';
import type { Course } from './types';

const adaptiveCourse: Course = {
  id: 'adaptive-course',
  title: 'Adaptive Course',
  version: 1,
  concepts: [
    { id: 'concept.alpha', name: 'Concept Alpha' },
    { id: 'concept.beta', name: 'Concept Beta' },
  ],
  items: [
    {
      id: 'card.alpha.1',
      type: 'card',
      conceptIds: ['concept.alpha'],
      prompt: 'Alpha?',
      answer: 'First',
    },
    {
      id: 'card.beta.1',
      type: 'card',
      conceptIds: ['concept.beta'],
      prompt: 'Beta?',
      answer: 'Second',
    },
  ],
};

describe('getDueQueue', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.close();
    await db.delete();
    await db.open();
  });

  it('adds weak-concept items when due queue is short', async () => {
    await installCompiledCourse(adaptiveCourse);

    const alpha = await db.schedule.get('card.alpha.1');
    const beta = await db.schedule.get('card.beta.1');

    if (!alpha || !beta) {
      throw new Error('Schedule seeding failed in test setup');
    }

    await db.schedule.bulkPut([
      { ...alpha, dueTs: Date.now() - 10_000 },
      { ...beta, dueTs: Date.now() + 86_400_000 },
    ]);

    await db.mastery.bulkPut([
      { conceptId: 'concept.alpha', probability: 0.8, lastUpdateTs: Date.now() },
      { conceptId: 'concept.beta', probability: 0.1, lastUpdateTs: Date.now() },
    ]);

    const queue = await getDueQueue(Date.now());
    expect(queue.length).toBeGreaterThanOrEqual(2);
    expect(queue.some((entry) => entry.schedule.itemId === 'card.alpha.1')).toBe(true);
    expect(queue.some((entry) => entry.schedule.itemId === 'card.beta.1')).toBe(true);
  });

  it('produces adaptive queue even when nothing is due', async () => {
    await installCompiledCourse(adaptiveCourse);
    const entries = await db.schedule.toArray();
    await db.schedule.bulkPut(
      entries.map((entry) => ({
        ...entry,
        dueTs: Date.now() + 86_400_000,
      })),
    );

    await db.mastery.bulkPut([
      { conceptId: 'concept.alpha', probability: 0.3, lastUpdateTs: Date.now() },
      { conceptId: 'concept.beta', probability: 0.2, lastUpdateTs: Date.now() },
    ]);

    const queue = await getDueQueue(Date.now());
    expect(queue.length).toBeGreaterThan(0);
  });
});
