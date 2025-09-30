import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { exportSnapshot, importSnapshot, type PocketStudySnapshot } from './backup';
import type { AttemptLog, InstalledCourse, MasteryEntry, ScheduleEntry } from './types';

const demoCourse: InstalledCourse = {
  id: 'demo',
  version: 1,
  installedTs: 111,
  title: 'Demo'
};

const scheduleEntry: ScheduleEntry = {
  itemId: 'card-1',
  courseId: 'demo',
  dueTs: 222,
  stability: 1,
  difficulty: 1.5,
  reps: 0,
  lapses: 0,
  lastGrade: 0,
  updatedAt: 222,
};

const masteryEntry: MasteryEntry = {
  conceptId: 'concept.one',
  probability: 0.5,
  lastUpdateTs: 333,
};

const attemptLog: AttemptLog = {
  id: 1,
  itemId: 'card-1',
  grade: 3,
  ts: 444,
  promptType: 'card',
};

describe('backup import/export', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.transaction('rw', [db.attempts, db.schedule, db.mastery, db.courses, db.profiles], async () => {
      await Promise.all([
        db.attempts.clear(),
        db.schedule.clear(),
        db.mastery.clear(),
        db.courses.clear(),
        db.profiles.clear(),
      ]);
    });
  });

  it('round-trips data through a snapshot', async () => {
    await db.transaction('rw', [db.courses, db.schedule, db.mastery, db.attempts], async () => {
      await db.courses.add(demoCourse);
      await db.schedule.add(scheduleEntry);
      await db.mastery.add(masteryEntry);
      await db.attempts.add(attemptLog);
    });

    const snapshot = await exportSnapshot();
    expect(snapshot.version).toBe(1);
    expect(snapshot.tables.courses).toHaveLength(1);

    await db.transaction('rw', [db.courses, db.schedule, db.mastery, db.attempts], async () => {
      await db.courses.clear();
      await db.schedule.clear();
      await db.mastery.clear();
      await db.attempts.clear();
    });

    await importSnapshot(snapshot);

    const [courses, schedule, mastery, attempts] = await Promise.all([
      db.courses.toArray(),
      db.schedule.toArray(),
      db.mastery.toArray(),
      db.attempts.toArray(),
    ]);

    expect(courses).toHaveLength(1);
    expect(schedule).toHaveLength(1);
    expect(mastery).toHaveLength(1);
    expect(attempts).toHaveLength(1);
  });

  it('rejects unsupported snapshot versions', async () => {
    const badSnapshot: PocketStudySnapshot = {
      version: 99,
      exportedAt: Date.now(),
      tables: {
        attempts: [],
        schedule: [],
        mastery: [],
        courses: [],
        profiles: [],
      },
    };

    await expect(importSnapshot(badSnapshot)).rejects.toThrow('Unsupported snapshot version');
  });
});
