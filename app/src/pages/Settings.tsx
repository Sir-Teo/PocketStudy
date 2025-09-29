import { useState } from 'react';

export default function SettingsPage() {
  const [dailyGoal, setDailyGoal] = useState(20);

  return (
    <section className="settings-page">
      <h1>Settings</h1>
      <div className="setting">
        <label htmlFor="daily-goal">Daily goal</label>
        <input
          id="daily-goal"
          type="number"
          min={5}
          max={200}
          value={dailyGoal}
          onChange={(event) => setDailyGoal(Number(event.target.value))}
        />
        <p className="help-text">Planned reviews per day. Persistence coming soon.</p>
      </div>
    </section>
  );
}
