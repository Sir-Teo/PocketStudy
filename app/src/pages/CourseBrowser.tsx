import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { listCourses } from '../lib/courseLoader';
import { installCourse, removeCourse } from '../lib/courseService';
import { db } from '../lib/db';

export default function CourseBrowserPage() {
  const { data: catalog, isLoading, error, refetch } = useQuery({
    queryKey: ['course-index'],
    queryFn: listCourses,
  });
  const installed = useLiveQuery(() => db.courses.toArray(), []);
  const [actionState, setActionState] = useState<string | null>(null);

  const installedSet = new Set(installed?.map((course) => course.id));

  if (isLoading) {
    return <p>Loading courses…</p>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Failed to load courses.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="courses-page">
      <h1>Courses</h1>
      <ul className="course-list">
        {catalog?.map((course) => (
          <li key={course.id} className="course-card">
            <div>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
            </div>
            <div className="course-actions">
              {installedSet.has(course.id) ? (
                <button
                  type="button"
                  className="secondary"
                  disabled={actionState === course.id}
                  onClick={async () => {
                    setActionState(course.id);
                    try {
                      await removeCourse(course.id);
                    } finally {
                      setActionState(null);
                    }
                  }}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  disabled={actionState === course.id}
                  onClick={async () => {
                    setActionState(course.id);
                    try {
                      await installCourse(course.id);
                    } finally {
                      setActionState(null);
                    }
                  }}
                >
                  Install
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
