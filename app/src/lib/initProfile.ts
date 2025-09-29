import { db } from './db';
import { DEFAULT_PROFILE_ID, type Profile } from './types';

export async function ensureDefaultProfile() {
  const existing = await db.profiles.get(DEFAULT_PROFILE_ID);
  if (existing) return existing;

  const profile: Profile = {
    id: DEFAULT_PROFILE_ID,
    displayName: 'You',
    createdAt: Date.now(),
    settings: {
      dailyGoal: 20,
    },
  };

  await db.profiles.put(profile);
  return profile;
}
