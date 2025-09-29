import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import HomePage from './Home';
import { db } from '../lib/db';
import { renderWithProviders } from '../testUtils';

const NOW = Date.now();

describe('HomePage', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.close();
    await db.delete();
    await db.open();

    const baseSchedule = {
      courseId: 'demo',
      stability: 1,
      difficulty: 2.5,
      reps: 0,
      lapses: 0,
      lastGrade: 0,
      updatedAt: NOW,
    } as const;

    await db.schedule.bulkPut([
      { ...baseSchedule, itemId: 'due-1', dueTs: NOW - 10_000 },
      { ...baseSchedule, itemId: 'due-2', dueTs: NOW - 5_000 },
    ]);

    await db.attempts.bulkAdd([
      { itemId: 'due-1', ts: NOW, grade: 3, promptType: 'card' },
      { itemId: 'due-2', ts: NOW - 86_400_000, grade: 3, promptType: 'card' },
    ]);
  });

  it('shows due count and current streak', async () => {
    renderWithProviders(<HomePage />);

    await screen.findByRole('heading', { name: /pocketstudy/i });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /start session \(2 due\)/i })).toBeInTheDocument();
    });

    const streakLabel = screen.getByText(/day streak/i);
    const streakCard = streakLabel.closest('.stat-card');
    expect(streakCard).not.toBeNull();
    await waitFor(() => {
      expect(streakCard?.querySelector('.stat-value')?.textContent).toBe('2');
    });
  });
});
