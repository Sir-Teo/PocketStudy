import { db } from './db';
import { augmentMcqDistractors } from './distractors';
import type { Course } from './types';
import { normalizeCourse, type RawCourse } from './normalizeCourse';

type CacheEntry = {
  loadedAt: number;
  course: Course;
};

const courseCache = new Map<string, CacheEntry>();

export async function loadCourse(id: string): Promise<Course> {
  const cached = courseCache.get(id);
  if (cached) {
    return cached.course;
  }

  const stored = await db.customCourses.get(id);
  if (stored) {
    const augmented = augmentMcqDistractors(stored);
    courseCache.set(id, { course: augmented, loadedAt: Date.now() });
    return augmented;
  }

  const response = await fetch(`/courses/${id}/course.json`);
  if (!response.ok) {
    throw new Error(`Failed to load course ${id}`);
  }

  const data = (await response.json()) as RawCourse;
  const normalized = augmentMcqDistractors(normalizeCourse(data));
  courseCache.set(id, { course: normalized, loadedAt: Date.now() });
  return normalized;
}

export async function listCourses(): Promise<Pick<Course, 'id' | 'title' | 'description'>[]> {
  const response = await fetch('/courses/index.json');
  if (!response.ok) {
    throw new Error('Failed to load course index');
  }

  return (await response.json()) as Pick<Course, 'id' | 'title' | 'description'>[];
}
