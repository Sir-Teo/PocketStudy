import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from './testUtils';
import App from './App';

const mocks = vi.hoisted(() => ({
  ensureCourseInstalled: vi.fn().mockResolvedValue({
    id: 'demo',
    version: 1,
    title: 'Demo',
    installedTs: Date.now(),
  }),
}));

vi.mock('./lib/courseService', () => ({
  ensureCourseInstalled: mocks.ensureCourseInstalled,
  installCourse: vi.fn(),
  removeCourse: vi.fn(),
  installCompiledCourse: vi.fn(),
}));

describe('App shell', () => {
  it('renders navigation and routes to the author editor', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    await waitFor(() => expect(mocks.ensureCourseInstalled).toHaveBeenCalledWith('demo'));

    const authorLink = await screen.findByRole('link', { name: /author/i });
    await user.click(authorLink);

    await screen.findByRole('heading', { name: /author a course/i });
  });
});
