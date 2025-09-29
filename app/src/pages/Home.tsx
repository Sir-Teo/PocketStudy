import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { ensureDefaultProfile } from '../lib/initProfile';

export default function HomePage() {
  useEffect(() => {
    ensureDefaultProfile().catch((error) => {
      console.error('Failed to ensure default profile', error);
    });
  }, []);

  const dueCount = useLiveQuery(async () => {
    const now = Date.now();
    return db.schedule.where('dueTs').belowOrEqual(now).count();
  }, []);

  const streak = useLiveQuery(async () => {
    const attempts = await db.attempts.orderBy('ts').reverse().limit(50).toArray();
    if (!attempts.length) return 0;
    const now = new Date();
    let currentStreak = 0;
    let lastDate = toDateKey(now);

    for (const attempt of attempts) {
      const attemptDate = toDateKey(new Date(attempt.ts));
      if (attemptDate === lastDate) {
        continue;
      }
      const expected = shiftDateKey(lastDate, -1);
      if (attemptDate === expected) {
        currentStreak += 1;
        lastDate = attemptDate;
      } else {
        break;
      }
    }
    return currentStreak + 1;
  }, []);

  return (
    <main className="main-page">
      <section className="hero">
        <h1>PocketStudy</h1>
        <p>Practice anything with quick, adaptive drills.</p>
        <div className="cta-row">
          <Link className="primary" to="/learn">
            Start session ({dueCount ?? 0} due)
          </Link>
          <Link className="secondary" to="/courses">
            Browse courses
          </Link>
        </div>
      </section>
      <section className="stats">
        <div className="stat-card">
          <span className="stat-value">{dueCount ?? 0}</span>
          <span className="stat-label">Due today</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{streak ?? 0}</span>
          <span className="stat-label">Day streak</span>
        </div>
      </section>
    </main>
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function shiftDateKey(key: string, delta: number) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month, day + delta);
  return toDateKey(date);
}
