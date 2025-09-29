import { db } from './db';
import { fsrsUpdate } from './fsrs';
import type { CourseItem, Grade, ItemType, ScheduleEntry } from './types';

const MAX_SESSION_ITEMS = 20;

export async function getDueItems(now = Date.now()) {
  const due = await db.schedule
    .where('dueTs')
    .belowOrEqual(now)
    .limit(MAX_SESSION_ITEMS)
    .toArray();

  return due;
}

export async function seedSchedule(items: CourseItem[], now = Date.now()) {
  const existingIds = new Set(await db.schedule.toCollection().primaryKeys());

  const seeds: ScheduleEntry[] = items
    .filter((item) => !existingIds.has(item.id))
    .map((item) => ({
      itemId: item.id,
      dueTs: now,
      stability: 24 * 60 * 60 * 1000,
      difficulty: 2.5,
      reps: 0,
      lapses: 0,
      lastGrade: 0,
      updatedAt: now,
    }));

  if (seeds.length) {
    await db.schedule.bulkPut(seeds);
  }
}

export async function recordReview(itemId: string, grade: Grade, promptType: ItemType, now = Date.now()) {
  const previous = await db.schedule.get(itemId);
  if (!previous) {
    throw new Error(`Cannot update schedule; missing entry for item ${itemId}`);
  }

  const update = fsrsUpdate(previous, grade, { now });

  await db.schedule.put({
    ...previous,
    ...update,
    updatedAt: now,
  });

  await db.attempts.add({
    itemId,
    ts: now,
    grade,
    promptType,
  });
}
