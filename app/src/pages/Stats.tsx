import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export default function StatsPage() {
  const recentAttempts = useLiveQuery(
    () => db.attempts.orderBy('ts').reverse().limit(20).toArray(),
    [],
  );

  const totalAttempts = useLiveQuery(() => db.attempts.count(), []);

  const mastery = useLiveQuery(() => db.mastery.toArray(), []);

  return (
    <section className="stats-page">
      <h1>Progress</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{totalAttempts ?? 0}</span>
          <span className="stat-label">Total reviews</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{mastery?.filter((m) => m.probability >= 0.8).length ?? 0}</span>
          <span className="stat-label">Mastered concepts</span>
        </div>
      </div>
      <h2>Recent activity</h2>
      <ul className="attempt-list">
        {recentAttempts?.map((attempt) => (
          <li key={attempt.id}>
            <span>{new Date(attempt.ts).toLocaleString()}</span>
            <span>Item: {attempt.itemId}</span>
            <span>Grade: {attempt.grade}</span>
          </li>
        )) ?? <li>No attempts yet</li>}
      </ul>
    </section>
  );
}
