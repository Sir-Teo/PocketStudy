import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { ensureDefaultProfile } from '../lib/initProfile';
import { DEFAULT_PROFILE_ID, type Profile } from '../lib/types';
import { exportSnapshot, importSnapshot } from '../lib/backup';

type StatusState = 'idle' | 'working' | 'success' | 'error';

export default function SettingsPage() {
  const [dailyGoalDraft, setDailyGoalDraft] = useState<number>(20);
  const [exportStatus, setExportStatus] = useState<StatusState>('idle');
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<StatusState>('idle');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ensureDefaultProfile().catch((error) => {
      console.error('Failed to ensure default profile', error);
    });
  }, []);

  const profile = useLiveQuery<Profile | undefined>(
    () => db.profiles.get(DEFAULT_PROFILE_ID),
    [],
  );

  useEffect(() => {
    if (profile?.settings?.dailyGoal) {
      setDailyGoalDraft(Number(profile.settings.dailyGoal));
    }
  }, [profile?.settings?.dailyGoal]);

  const handleDailyGoalBlur = async () => {
    if (!profile) return;
    const next = Number.isFinite(dailyGoalDraft) ? Math.max(5, dailyGoalDraft) : 20;
    try {
      await db.profiles.update(profile.id, {
        settings: { ...profile.settings, dailyGoal: next },
      });
      setDailyGoalDraft(next);
    } catch (error) {
      console.error('Failed to persist daily goal', error);
    }
  };

  const handleExport = async () => {
    setExportStatus('working');
    setExportMessage(null);
    try {
      const snapshot = await exportSnapshot();
      const fileName = `pocketstudy-backup-${new Date(snapshot.exportedAt)
        .toISOString()
        .replace(/[:.]/g, '-')}.json`;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportStatus('success');
      setExportMessage('Backup downloaded.');
    } catch (error) {
      console.error('Failed to export snapshot', error);
      setExportStatus('error');
      setExportMessage('Export failed. Please try again.');
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Importing a backup will replace your current progress. Continue?',
      );
      if (!confirmed) {
        event.target.value = '';
        return;
      }
    }

    setImportStatus('working');
    setImportMessage(null);

    try {
      const contents = await file.text();
      const snapshot = JSON.parse(contents);
      await importSnapshot(snapshot);
      setImportStatus('success');
      setImportMessage('Import complete. Reload to ensure all views refresh.');
    } catch (error) {
      console.error('Failed to import snapshot', error);
      setImportStatus('error');
      setImportMessage('Import failed. Make sure the file is a PocketStudy backup.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <main className="settings-page">
      <h1>Settings</h1>

      <section className="setting">
        <label htmlFor="daily-goal">Daily goal</label>
        <input
          id="daily-goal"
          type="number"
          min={5}
          max={200}
          value={dailyGoalDraft}
          onChange={(event) => setDailyGoalDraft(Number(event.target.value))}
          onBlur={handleDailyGoalBlur}
        />
        <p className="help-text">Reviews per day. Saved to your profile.</p>
      </section>

      <section className="setting">
        <h2>Backup</h2>
        <p>Export your progress to a JSON file.</p>
        <button
          type="button"
          className="primary"
          onClick={handleExport}
          disabled={exportStatus === 'working'}
        >
          {exportStatus === 'working' ? 'Preparing…' : 'Download backup'}
        </button>
        {exportMessage ? (
          <p className={`status-message${exportStatus === 'error' ? ' error' : ''}`}>
            {exportMessage}
          </p>
        ) : null}
      </section>

      <section className="setting">
        <h2>Restore</h2>
        <p>Import a previously downloaded backup.</p>
        <label className="file-input" htmlFor="backup-file">
          Select backup file
          <input
            id="backup-file"
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            disabled={importStatus === 'working'}
          />
        </label>
        {importMessage ? (
          <p className={`status-message${importStatus === 'error' ? ' error' : ''}`}>
            {importMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
