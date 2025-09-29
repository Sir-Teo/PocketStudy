import type { Grade, ScheduleEntry } from './types';

type UpdateResult = Pick<ScheduleEntry, 'stability' | 'difficulty' | 'dueTs' | 'reps' | 'lapses' | 'lastGrade'>;

const MIN_INTERVAL = 24 * 60 * 60 * 1000; // 1 day

const DIFFICULTY_DELTA: Record<Grade, number> = {
  0: 0.2,
  1: 0.1,
  2: 0,
  3: -0.1,
};

const STABILITY_MULTIPLIER: Record<Grade, number> = {
  0: 0.5,
  1: 0.8,
  2: 1.7,
  3: 2.2,
};

export interface FsrsUpdateOptions {
  now?: number;
  elapsedMs?: number;
}

export function fsrsUpdate(
  previous: ScheduleEntry | undefined,
  grade: Grade,
  options: FsrsUpdateOptions = {}
): UpdateResult {
  const now = options.now ?? Date.now();
  const elapsedMs = options.elapsedMs ?? (previous ? Math.max(1, now - previous.dueTs) : MIN_INTERVAL);

  const prevStability = previous?.stability ?? MIN_INTERVAL;
  const prevDifficulty = previous?.difficulty ?? 2.5;
  const reps = (previous?.reps ?? 0) + 1;
  const lapses = previous ? previous.lapses + (grade === 0 ? 1 : 0) : grade === 0 ? 1 : 0;

  const difficulty = clamp(prevDifficulty + DIFFICULTY_DELTA[grade], 1, 3);
  const stability = clamp(prevStability * STABILITY_MULTIPLIER[grade] + (grade >= 2 ? MIN_INTERVAL : 0), MIN_INTERVAL, MIN_INTERVAL * 365);

  const interval = Math.max(MIN_INTERVAL, Math.round(stability));
  const dueTs = now + interval;

  return {
    stability,
    difficulty,
    dueTs,
    reps,
    lapses,
    lastGrade: grade,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
