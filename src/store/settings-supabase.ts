import { createClient } from "@/lib/supabase/client";

export type Settings = {
  id: "global";
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  reviewOrder: "mixed" | "oldFirst" | "newFirst";
};

const DEFAULT_SETTINGS: Settings = {
  id: "global",
  newCardsPerDay: 20,
  maxReviewsPerDay: 9999,
  reviewOrder: "mixed",
};

type UserSettingsRow = {
  user_id: string;
  default_new_per_day: number;
  default_reviews_per_day: number;
  default_display_order: "mixed" | "oldFirst" | "newFirst";
};

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated");
  }
  return data.user.id;
}

function fromUserSettings(row: UserSettingsRow): Settings {
  return {
    id: "global",
    newCardsPerDay: row.default_new_per_day,
    maxReviewsPerDay: row.default_reviews_per_day,
    reviewOrder: row.default_display_order,
  };
}

function toUserSettingsRow(userId: string, settings: Settings): UserSettingsRow {
  return {
    user_id: userId,
    default_new_per_day: settings.newCardsPerDay,
    default_reviews_per_day: settings.maxReviewsPerDay,
    default_display_order: settings.reviewOrder,
  };
}

export async function getSettings(): Promise<Settings> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, default_new_per_day, default_reviews_per_day, default_display_order")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insertError } = await supabase
      .from("user_settings")
      .insert(toUserSettingsRow(userId, DEFAULT_SETTINGS));
    if (insertError) throw insertError;
    return { ...DEFAULT_SETTINGS };
  }

  return fromUserSettings(data as UserSettingsRow);
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const next = { ...DEFAULT_SETTINGS, ...settings };

  const { error } = await supabase
    .from("user_settings")
    .upsert(toUserSettingsRow(userId, next));

  if (error) throw error;
}

export function getLearningSteps(): number[] {
  return [1];
}
