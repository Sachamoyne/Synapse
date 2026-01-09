import {
  getSettings as getSettingsSupabase,
  updateSettings as updateSettingsSupabase,
  type Settings,
} from "./settings-supabase";

export type { Settings };

/**
 * Get settings (from Supabase, auto-created by trigger)
 */
export async function getSettings(): Promise<Settings> {
  return await getSettingsSupabase();
}

/**
 * Update settings (partial update)
 */
export async function updateSettings(
  partialSettings: Partial<Settings>
): Promise<void> {
  await updateSettingsSupabase(partialSettings);
}

export function getLearningSteps(): number[] {
  return [1];
}
