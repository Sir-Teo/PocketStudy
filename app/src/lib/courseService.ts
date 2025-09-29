import { db } from './db';
import { loadCourse } from './courseLoader';
import { seedSchedule } from './scheduler';
import type { Course, InstalledCourse } from './types';

export async function installCourse(id: string): Promise<Course> {
  const course = await loadCourse(id);
  const installed: InstalledCourse = {
    id: course.id,
    version: course.version,
    installedTs: Date.now(),
    title: course.title,
  };

  await db.transaction('rw', db.courses, db.schedule, async () => {
    await db.courses.put(installed);
    await seedSchedule(course);
  });

  return course;
}

export async function removeCourse(id: string) {
  await db.transaction('rw', db.courses, db.schedule, db.mastery, db.customCourses, async () => {
    const course = await loadCourse(id).catch(() => null);
    await db.courses.delete(id);
    await db.schedule.where('courseId').equals(id).delete();
    await db.customCourses.delete(id);
    if (course) {
      const conceptIds = course.concepts.map((concept) => concept.id);
      if (conceptIds.length) {
        await db.mastery.bulkDelete(conceptIds);
      }
    }
  });
}

export async function ensureCourseInstalled(id: string) {
  const existing = await db.courses.get(id);
  if (existing) return existing;
  const course = await installCourse(id);
  return {
    id: course.id,
    version: course.version,
    title: course.title,
    installedTs: Date.now(),
  } satisfies InstalledCourse;
}

export async function installCompiledCourse(course: Course) {
  const installed: InstalledCourse = {
    id: course.id,
    version: course.version,
    title: course.title,
    installedTs: Date.now(),
  };

  await db.transaction('rw', db.customCourses, db.courses, db.schedule, async () => {
    await db.customCourses.put(course);
    await db.courses.put(installed);
    await seedSchedule(course);
  });
}
