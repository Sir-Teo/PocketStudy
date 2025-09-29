import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import StatsPage from './Stats';
import { db } from '../lib/db';
import { renderWithProviders } from '../testUtils';

const NOW = Date.now();

describe('StatsPage', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.close();
    await db.delete();
    await db.open();

    await db.attempts.bulkAdd([
      { itemId: 'item-1', ts: NOW, grade: 3, promptType: 'card' },
      { itemId: 'item-2', ts: NOW - 60_000, grade: 2, promptType: 'mcq' },
    ]);

    await db.mastery.bulkPut([
      { conceptId: 'concept.alpha', probability: 0.9, lastUpdateTs: NOW },
      { conceptId: 'concept.beta', probability: 0.6, lastUpdateTs: NOW },
    ]);
  });

  it('summarizes review totals and mastery counts', async () => {
    renderWithProviders(<StatsPage />);

    const totalCardLabel = await screen.findByText(/total reviews/i);
    const totalCard = totalCardLabel.closest('.stat-card');
    expect(totalCard).not.toBeNull();
    await waitFor(() => {
      expect(totalCard?.querySelector('.stat-value')?.textContent).toBe('2');
    });

    const masteredLabel = screen.getByText(/mastered concepts/i);
    const masteredCard = masteredLabel.closest('.stat-card');
    expect(masteredCard).not.toBeNull();
    await waitFor(() => {
      expect(masteredCard?.querySelector('.stat-value')?.textContent).toBe('1');
    });

    await waitFor(() => {
      expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    });
  });
});
