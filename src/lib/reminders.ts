/**
 * In-app reminder nudges (spec §3.7).
 *
 * True push/email reminders need FCM/SendGrid, which are out of MVP scope.
 * These are the same signals surfaced in-app, so the feature is genuinely
 * useful now rather than a dead settings screen.
 */

export type Nudge = { kind: "water" | "meal"; text: string };

/** Waking window used to pace water intake across the day. */
const WAKE_HOUR = 7;
const SLEEP_HOUR = 22;

export type NudgeInput = {
  localHour: number;
  waterMl: number;
  waterTargetMl: number;
  hasLoggedFood: boolean;
  settings: {
    waterRemindersEnabled: boolean;
    mealRemindersEnabled: boolean;
    mealReminderHour: number;
  };
};

export function computeNudges(input: NudgeInput): Nudge[] {
  const nudges: Nudge[] = [];
  const { localHour, settings } = input;

  // --- water pacing ---
  if (
    settings.waterRemindersEnabled &&
    input.waterTargetMl > 0 &&
    localHour >= WAKE_HOUR &&
    localHour < SLEEP_HOUR
  ) {
    const elapsed = (localHour - WAKE_HOUR) / (SLEEP_HOUR - WAKE_HOUR);
    const expected = input.waterTargetMl * elapsed;
    const shortfall = expected - input.waterMl;

    // Only nudge on a meaningful gap, so it doesn't fire constantly.
    if (shortfall >= 400) {
      nudges.push({
        kind: "water",
        text: `You're about ${Math.round(shortfall / 50) * 50}ml behind your usual water pace for this time of day.`,
      });
    }
  }

  // --- unlogged day ---
  if (
    settings.mealRemindersEnabled &&
    !input.hasLoggedFood &&
    localHour >= settings.mealReminderHour
  ) {
    nudges.push({
      kind: "meal",
      text: "Nothing logged today yet — a one-line description is enough.",
    });
  }

  return nudges;
}
