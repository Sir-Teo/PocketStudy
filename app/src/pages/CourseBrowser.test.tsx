import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../testUtils';
import CourseBrowserPage from './CourseBrowser';
import { db } from '../lib/db';

const mocks = vi.hoisted(() => ({
  listCourses: vi.fn(),
  installCourse: vi.fn(),
  removeCourse: vi.fn(),
}));

vi.mock('../lib/courseLoader', () => ({
  listCourses: mocks.listCourses,
  loadCourse: vi.fn(),
}));

vi.mock('../lib/courseService', () => ({
  installCourse: mocks.installCourse,
  removeCourse: mocks.removeCourse,
  ensureCourseInstalled: vi.fn(),
  installCompiledCourse: vi.fn(),
}));

describe('CourseBrowserPage', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    mocks.listCourses.mockResolvedValue([
      { id: 'demo', title: 'Demo', description: 'Demo course' },
      { id: 'habits', title: 'Habits', description: 'Habits course' },
    ]);
    mocks.installCourse.mockResolvedValue(undefined);
    mocks.removeCourse.mockResolvedValue(undefined);

    await db.close();
    await db.delete();
    await db.open();
  });

  it('installs a course when the install button is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CourseBrowserPage />);

    const demoHeading = await screen.findByRole('heading', { name: 'Demo' });
    const courseCard = demoHeading.closest('.course-card');
    const installButton = courseCard?.querySelector('button.primary');
    expect(installButton).not.toBeNull();
    await user.click(installButton!);

    await waitFor(() => expect(mocks.installCourse).toHaveBeenCalledWith('demo'));
  });

  it('shows authored courses and removes them on request', async () => {
    await db.customCourses.put({
      id: 'authored-one',
      title: 'Authored',
      version: 1,
      description: 'Course we created',
      concepts: [],
      items: [],
    });

    await db.courses.put({
      id: 'authored-one',
      title: 'Authored',
      version: 1,
      installedTs: Date.now(),
    });

    const user = userEvent.setup();
    renderWithProviders(<CourseBrowserPage />);

    const authoredHeading = await screen.findByRole('heading', { name: /your authored courses/i });
    const authoredSection = authoredHeading.closest('.authored-courses');
    const authoredCard = authoredSection?.querySelector('.course-card');
    const removeButton = authoredCard?.querySelector('button.secondary');
    expect(removeButton).not.toBeNull();
    await user.click(removeButton!);

    await waitFor(() => expect(mocks.removeCourse).toHaveBeenCalledWith('authored-one'));
  });
});
