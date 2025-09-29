import Dexie, { type Table } from 'dexie';
import type {
  AttemptLog,
  Course,
  InstalledCourse,
  MasteryEntry,
  Profile,
  ScheduleEntry,
} from './types';

export class PocketStudyDB extends Dexie {
  attempts!: Table<AttemptLog, number>;
  schedule!: Table<ScheduleEntry, string>;
  mastery!: Table<MasteryEntry, string>;
  profiles!: Table<Profile, string>;
  courses!: Table<InstalledCourse, string>;
  customCourses!: Table<Course, string>;

  constructor() {
    super('PocketStudyDB');

    this.version(1).stores({
      attempts: '++id,itemId,ts',
      schedule: 'itemId,courseId,dueTs',
      mastery: 'conceptId',
      profiles: 'id',
      courses: 'id',
    });

    this.version(2)
      .stores({
        attempts: '++id,itemId,ts',
        schedule: 'itemId,courseId,dueTs',
        mastery: 'conceptId',
        profiles: 'id',
        courses: 'id',
        customCourses: 'id',
      })
      .upgrade(async (transaction) => {
        if (!transaction.table('profiles')) {
          return;
        }
        const profileTable = transaction.table('profiles');
        const existing = await profileTable.get('default');
        if (existing && !('settings' in existing)) {
          existing.settings = { dailyGoal: 20 };
          await profileTable.put(existing);
        }
      });
  }
}

export const db = new PocketStudyDB();
