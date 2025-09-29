import { db } from './db';
import { loadCourse } from './courseLoader';
import type { Course, CourseItem, ScheduleEntry } from './types';

export interface SessionQueueItem {
  schedule: ScheduleEntry;
  item: CourseItem;
  course: Course;
}

const ADAPTIVE_TARGET = 12;

export async function getDueQueue(now = Date.now()): Promise<SessionQueueItem[]> {
  const dueEntries = await db.schedule.where('dueTs').belowOrEqual(now).sortBy('dueTs');

  const courseMap = new Map<string, Course>();

  const queue: SessionQueueItem[] = [];
  const queuedItemIds = new Set<string>();

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
    queuedItemIds.add(entry.itemId);
  }

  if (queue.length >= ADAPTIVE_TARGET) {
    return queue;
  }

  const mastery = await db.mastery.toArray();
  mastery.sort((a, b) => (a.probability ?? 1) - (b.probability ?? 1));
  if (!mastery.length) {
    return queue;
  }

  const scheduleEntries = await db.schedule.toArray();
  const scheduleMap = new Map(scheduleEntries.map((entry) => [entry.itemId, entry]));
  const installedCourses = await db.courses.toArray();

  for (const masteryEntry of mastery) {
    for (const installed of installedCourses) {
      let course = courseMap.get(installed.id);
      if (!course) {
        course = await loadCourse(installed.id);
        courseMap.set(course.id, course);
      }

      const matchingItems = course.items.filter((item) =>
        item.conceptIds.includes(masteryEntry.conceptId),
      );

      for (const item of matchingItems) {
        if (queuedItemIds.has(item.id)) {
          continue;
        }
        const schedule = scheduleMap.get(item.id);
        if (!schedule) {
          continue;
        }

        queue.push({
          schedule,
          item,
          course,
        });
        queuedItemIds.add(item.id);
        break;
      }

      if (queue.length >= ADAPTIVE_TARGET) {
        return queue;
      }
    }
  }

  return queue;
}
