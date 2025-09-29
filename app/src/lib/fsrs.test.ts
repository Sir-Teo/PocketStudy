import { describe, expect, it } from 'vitest';
import { fsrsUpdate } from './fsrs';
import type { ScheduleEntry } from './types';

describe('fsrsUpdate', () => {
  const baseEntry: ScheduleEntry = {
    itemId: 'card.1',
    courseId: 'demo',
    dueTs: Date.now() - 1000,
    stability: 24 * 60 * 60 * 1000,
    difficulty: 2.5,
    reps: 3,
    lapses: 0,
    lastGrade: 2,
    updatedAt: Date.now() - 1000,
  };

  it('increases stability on good grades', () => {
    const result = fsrsUpdate(baseEntry, 3);
    expect(result.stability).toBeGreaterThan(baseEntry.stability);
    expect(result.dueTs).toBeGreaterThan(Date.now());
    expect(result.difficulty).toBeLessThan(baseEntry.difficulty);
  });

  it('penalises stability on failure', () => {
    const result = fsrsUpdate(baseEntry, 0);
    expect(result.stability).toBeLessThanOrEqual(baseEntry.stability);
    expect(result.difficulty).toBeGreaterThan(baseEntry.difficulty);
    expect(result.reps).toBe(baseEntry.reps + 1);
    expect(result.lapses).toBe(baseEntry.lapses + 1);
  });

  it('seeds defaults when no previous entry exists', () => {
    const result = fsrsUpdate(undefined, 2);
    expect(result.stability).toBeGreaterThan(0);
    expect(result.difficulty).toBeGreaterThan(0);
    expect(result.reps).toBe(1);
  });
});
