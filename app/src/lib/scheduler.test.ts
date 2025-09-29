import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { seedSchedule, getDueItems, recordReview } from './scheduler';
import type { Course } from './types';

const demoCourse: Course = {
  id: 'course.demo',
  title: 'Demo Course',
  version: 1,
  concepts: [
    { id: 'concept.one', name: 'Concept One' },
    { id: 'concept.two', name: 'Concept Two' },
  ],
  items: [
    {
      id: 'card-one',
      type: 'card',
      conceptIds: ['concept.one'],
      prompt: 'What is concept one?',
      answer: 'Concept One',
    },
    {
      id: 'card-two',
      type: 'card',
      conceptIds: ['concept.two'],
      prompt: 'What is concept two?',
      answer: 'Concept Two',
    },
  ],
};

beforeAll(async () => {
  await db.open();
});

beforeEach(async () => {
  await db.transaction('rw', db.schedule, db.attempts, db.courses, async () => {
    await db.schedule.clear();
    await db.attempts.clear();
    await db.courses.clear();
  });
});

describe('scheduler', () => {
  it('seeds schedule entries for new course items', async () => {
    const now = Date.UTC(2025, 0, 1);

    await seedSchedule(demoCourse, now);

    const entries = await db.schedule.orderBy('itemId').toArray();
    expect(entries).toHaveLength(demoCourse.items.length);
    expect(entries[0]).toMatchObject({ itemId: 'card-one', courseId: 'course.demo', dueTs: now });
  });

  it('returns due items within the limit', async () => {
    const now = Date.UTC(2025, 0, 2);

    await seedSchedule(demoCourse, now);
    const due = await getDueItems(now);

    expect(due).toHaveLength(2);
    expect(due.map((entry) => entry.itemId)).toContain('card-two');
  });

  it('records review results and logs attempt', async () => {
    const now = Date.UTC(2025, 0, 3);

    await seedSchedule(demoCourse, now);
    await recordReview('card-two', 3, 'card', now + 1000);

    const updated = await db.schedule.get('card-two');
    expect(updated).toMatchObject({ lastGrade: 3, reps: 1 });
    expect(updated?.dueTs).toBeGreaterThan(now);

    const attempts = await db.attempts.toArray();
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ itemId: 'card-two', grade: 3, promptType: 'card' });
  });
});
