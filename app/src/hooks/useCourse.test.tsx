import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderWithProviders } from '../testUtils';
import { useCourse } from './useCourse';

const mocks = vi.hoisted(() => ({
  loadCourse: vi.fn(),
}));

vi.mock('../lib/courseLoader', () => ({
  loadCourse: mocks.loadCourse,
  listCourses: vi.fn(),
}));

afterEach(() => {
  mocks.loadCourse.mockReset();
});

describe('useCourse', () => {
  it('fetches course data when an id is provided', async () => {
    mocks.loadCourse.mockResolvedValue({ id: 'demo', title: 'Demo Course', version: 1, concepts: [], items: [] });

    function TestComponent() {
      const query = useCourse('demo');
      return <div>{query.data?.title ?? query.status}</div>;
    }

    renderWithProviders(<TestComponent />);

    await waitFor(() => expect(mocks.loadCourse).toHaveBeenCalledWith('demo'));
    await screen.findByText('Demo Course');
  });

  it('does not fetch when course id is undefined', () => {
    function TestComponent() {
      useCourse(undefined);
      return <div>noop</div>;
    }

    renderWithProviders(<TestComponent />);

    expect(mocks.loadCourse).not.toHaveBeenCalled();
  });
});
