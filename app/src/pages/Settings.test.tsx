import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from './Settings';
import { db } from '../lib/db';
import { renderWithProviders } from '../testUtils';

const mocks = vi.hoisted(() => ({
  exportSnapshot: vi.fn(),
  importSnapshot: vi.fn(),
}));

vi.mock('../lib/backup', () => ({
  exportSnapshot: mocks.exportSnapshot,
  importSnapshot: mocks.importSnapshot,
}));

const originalURL = globalThis.URL;
const originalConfirm = globalThis.confirm;

beforeAll(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:download'),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('SettingsPage', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await db.close();
    await db.delete();
    await db.open();
    await db.profiles.put({
      id: 'default',
      displayName: 'You',
      createdAt: Date.now(),
      settings: { dailyGoal: 20 },
    });
    mocks.exportSnapshot.mockResolvedValue({
      version: 1,
      exportedAt: Date.now(),
      tables: { attempts: [], schedule: [], mastery: [], courses: [], profiles: [] },
    });
    mocks.importSnapshot.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mocks.exportSnapshot.mockReset();
    mocks.importSnapshot.mockReset();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    globalThis.URL = originalURL;
    globalThis.confirm = originalConfirm;
  });

  it('persists daily goal changes', async () => {
    const updateSpy = vi.spyOn(db.profiles, 'update');
    renderWithProviders(<SettingsPage />);

    const input = (await screen.findByLabelText(/daily goal/i)) as HTMLInputElement;
    await screen.findByDisplayValue('20');
    const user = userEvent.setup();
    await user.click(input);
    await user.keyboard('{Control>}a{/Control}{Backspace}');
    await user.type(input, '42');
    await waitFor(() => expect(input.value).toBe('42'));
    fireEvent.blur(input);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('default', {
        settings: expect.objectContaining({ dailyGoal: 42 }),
      });
    });

    updateSpy.mockRestore();
  });

  it('exports a snapshot', async () => {
    const clickSpy = vi.fn();
    const originalCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement');
    createSpy.mockImplementation((tagName: string) => {
      const element = originalCreate(tagName);
      if (tagName === 'a') {
        vi.spyOn(element, 'click').mockImplementation(clickSpy);
      }
      return element;
    });

    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    const exportButton = await screen.findByRole('button', { name: /download backup/i });
    await user.click(exportButton);

    await waitFor(() => {
      expect(mocks.exportSnapshot).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  it('imports a snapshot file', async () => {
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      tables: { attempts: [], schedule: [], mastery: [], courses: [], profiles: [] },
    };
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(JSON.stringify(payload)),
    });
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    const input = await screen.findByLabelText(/select backup file/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(mocks.importSnapshot).toHaveBeenCalled();
    });
  });
});
