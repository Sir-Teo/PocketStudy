import Dexie, { type Table } from 'dexie';
import type {
  AttemptLog,
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

  constructor() {
    super('PocketStudyDB');

    this.version(1).stores({
      attempts: '++id,itemId,ts',
      schedule: 'itemId,courseId,dueTs',
      mastery: 'conceptId',
      profiles: 'id',
      courses: 'id',
    });
  }
}

export const db = new PocketStudyDB();
