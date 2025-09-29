import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { installCompiledCourse, removeCourse } from './courseService';
import { loadCourse } from './courseLoader';
import type { Course } from './types';

const authoredCourse: Course = {
  id: 'authored-test-course',
  title: 'Authored Test Course',
  version: 1,
  concepts: [
    { id: 'concept.example', name: 'Concept Example' },
  ],
  items: [
    {
      id: 'card.concept-example.1',
      type: 'card',
      conceptIds: ['concept.example'],
      prompt: 'What is the concept?',
      answer: 'An example concept.',
    },
  ],
};

describe('installCompiledCourse', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.close();
    await db.delete();
    await db.open();
  });

  it('persists authored course content for later sessions', async () => {
    await installCompiledCourse(authoredCourse);

    const stored = await db.customCourses.get(authoredCourse.id);
    expect(stored?.title).toBe(authoredCourse.title);

    const scheduleEntries = await db.schedule.where('courseId').equals(authoredCourse.id).toArray();
    expect(scheduleEntries).toHaveLength(1);

    const loaded = await loadCourse(authoredCourse.id);
    expect(loaded.items).toHaveLength(1);
  });

  it('removes authored data when course is removed', async () => {
    await installCompiledCourse(authoredCourse);
    await removeCourse(authoredCourse.id);

    const [courseMeta, customCourse, scheduleEntries] = await Promise.all([
      db.courses.get(authoredCourse.id),
      db.customCourses.get(authoredCourse.id),
      db.schedule.where('courseId').equals(authoredCourse.id).toArray(),
    ]);

    expect(courseMeta).toBeUndefined();
    expect(customCourse).toBeUndefined();
    expect(scheduleEntries).toHaveLength(0);
  });
});
