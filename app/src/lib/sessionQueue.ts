import { db } from './db';
import { loadCourse } from './courseLoader';
import type { Course, CourseItem, ScheduleEntry } from './types';

export interface SessionQueueItem {
  schedule: ScheduleEntry;
  item: CourseItem;
  course: Course;
}

export async function getDueQueue(now = Date.now()): Promise<SessionQueueItem[]> {
  const dueEntries = await db.schedule.where('dueTs').belowOrEqual(now).sortBy('dueTs');
  if (!dueEntries.length) return [];

  const courseMap = new Map<string, Course>();

  const queue: SessionQueueItem[] = [];

  for (const entry of dueEntries) {
    let course = courseMap.get(entry.courseId);
    if (!course) {
      course = await loadCourse(entry.courseId);
      courseMap.set(course.id, course);
    }

    const item = course.items.find((candidate) => candidate.id === entry.itemId);
    if (!item) {
      // Skip orphaned schedule entries
      continue;
    }

    queue.push({
      schedule: entry,
      item,
      course,
    });
  }

  return queue;
}
