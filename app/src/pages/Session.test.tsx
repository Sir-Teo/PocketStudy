import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SessionPage from './Session';
import { renderWithProviders } from '../testUtils';

const mocks = vi.hoisted(() => ({
  getDueQueue: vi.fn(),
  recordReview: vi.fn(),
  updateMastery: vi.fn(),
  ensureCourseInstalled: vi.fn().mockResolvedValue({}),
}));

vi.mock('../lib/courseService', () => ({
  ensureCourseInstalled: mocks.ensureCourseInstalled,
}));

vi.mock('../lib/sessionQueue', () => ({
  getDueQueue: mocks.getDueQueue,
}));

vi.mock('../lib/scheduler', () => ({
  recordReview: mocks.recordReview,
}));

vi.mock('../lib/progress', () => ({
  updateMastery: mocks.updateMastery,
}));

afterEach(() => {
  mocks.getDueQueue.mockReset();
  mocks.recordReview.mockReset();
  mocks.updateMastery.mockReset();
  mocks.ensureCourseInstalled.mockClear();
});

describe('SessionPage', () => {
  it('renders a due card and records grades', async () => {
    mocks.getDueQueue.mockResolvedValue([]);
    mocks.getDueQueue.mockResolvedValueOnce([
      {
        schedule: { itemId: 'card-1', courseId: 'demo', dueTs: Date.now() },
        item: { id: 'card-1', type: 'card', conceptIds: [], prompt: 'Prompt?', answer: 'Answer!' },
        course: { id: 'demo', title: 'Demo Course', version: 1, concepts: [], items: [] },
      },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<SessionPage />);

    await screen.findByRole('heading', { name: /demo course/i });

    const revealButton = screen.getByRole('button', { name: /reveal/i });
    await user.click(revealButton);

    const easyButton = await screen.findByRole('button', { name: /easy/i });
    await user.click(easyButton);

    await waitFor(() => {
      expect(mocks.recordReview).toHaveBeenCalledWith('card-1', 3, 'card');
      expect(mocks.updateMastery).toHaveBeenCalled();
    });
  });

  it('shows empty state when queue is empty', async () => {
    mocks.getDueQueue.mockResolvedValueOnce([]);
    renderWithProviders(<SessionPage />);
    await screen.findByText(/all caught up/i);
  });
});
