import { db } from './db';
import { ensureDefaultProfile } from './initProfile';
import type {
  AttemptLog,
  InstalledCourse,
  MasteryEntry,
  Profile,
  ScheduleEntry,
} from './types';

const SNAPSHOT_VERSION = 1;

export interface PocketStudySnapshot {
  version: number;
  exportedAt: number;
  tables: {
    attempts: AttemptLog[];
    schedule: ScheduleEntry[];
    mastery: MasteryEntry[];
    courses: InstalledCourse[];
    profiles: Profile[];
  };
}

async function fetchTableData<T>(getter: () => Promise<T[]>): Promise<T[]> {
  const result = await getter();
  return result.map((entry) => ({ ...entry }));
}

export async function exportSnapshot(): Promise<PocketStudySnapshot> {
  const [attempts, schedule, mastery, courses, profiles] = await Promise.all([
    fetchTableData(() => db.attempts.toArray()),
    fetchTableData(() => db.schedule.toArray()),
    fetchTableData(() => db.mastery.toArray()),
    fetchTableData(() => db.courses.toArray()),
    fetchTableData(() => db.profiles.toArray()),
  ]);

  return {
    version: SNAPSHOT_VERSION,
    exportedAt: Date.now(),
    tables: { attempts, schedule, mastery, courses, profiles },
  };
}

export async function importSnapshot(snapshot: PocketStudySnapshot): Promise<void> {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid snapshot payload');
  }

  if (snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`);
  }

  const { tables } = snapshot;
  if (!tables) {
    throw new Error('Snapshot is missing table data');
  }

  await db.transaction(
    'rw',
    [db.attempts, db.schedule, db.mastery, db.courses, db.profiles],
    async () => {
      await Promise.all([
        db.attempts.clear(),
        db.schedule.clear(),
        db.mastery.clear(),
        db.courses.clear(),
        db.profiles.clear(),
      ]);

      if (tables.courses?.length) {
        await db.courses.bulkPut(tables.courses);
      }
      if (tables.schedule?.length) {
        await db.schedule.bulkPut(tables.schedule);
      }
      if (tables.attempts?.length) {
        await db.attempts.bulkPut(tables.attempts);
      }
      if (tables.mastery?.length) {
        await db.mastery.bulkPut(tables.mastery);
      }
      if (tables.profiles?.length) {
        await db.profiles.bulkPut(tables.profiles);
      }
    },
  );

  await ensureDefaultProfile();
}
