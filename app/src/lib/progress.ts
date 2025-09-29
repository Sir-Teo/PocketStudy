import { db } from './db';
import type { CourseItem, Grade, MasteryEntry } from './types';

const MASTERY_STEP = 0.1;

export async function updateMastery(items: CourseItem[], grade: Grade, now = Date.now()) {
  const conceptIds = new Set(items.flatMap((item) => item.conceptIds));

  await Promise.all(
    Array.from(conceptIds).map(async (conceptId) => {
      const existing = await db.mastery.get(conceptId);
      const delta = grade >= 2 ? MASTERY_STEP : -MASTERY_STEP;
      const probability = clamp((existing?.probability ?? 0.2) + delta, 0, 1);
      const entry: MasteryEntry = {
        conceptId,
        probability,
        lastUpdateTs: now,
      };
      await db.mastery.put(entry);
    })
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
