"use client";

import { useActionState } from "react";
import { saveReminderSettings, type SettingsState } from "@/app/settings/actions";

export type ReminderDefaults = {
  waterRemindersEnabled: boolean;
  waterReminderIntervalMin: number;
  mealRemindersEnabled: boolean;
  mealReminderHour: number;
  weeklySummaryEnabled: boolean;
};

const INTERVALS = [30, 60, 90, 120, 180, 240];

export function ReminderSettingsForm({ defaults }: { defaults: ReminderDefaults }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveReminderSettings,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="waterRemindersEnabled"
          defaultChecked={defaults.waterRemindersEnabled}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Nudge me when I fall behind on water
      </label>

      <div>
        <label htmlFor="waterReminderIntervalMin" className="block text-xs text-muted">
          Water reminder interval
        </label>
        <select
          id="waterReminderIntervalMin"
          name="waterReminderIntervalMin"
          defaultValue={defaults.waterReminderIntervalMin}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {INTERVALS.map((m) => (
            <option key={m} value={m}>
              Every {m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? "" : "s"}`}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="mealRemindersEnabled"
          defaultChecked={defaults.mealRemindersEnabled}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Remind me if I haven&apos;t logged anything
      </label>

      <div>
        <label htmlFor="mealReminderHour" className="block text-xs text-muted">
          Remind me after
        </label>
        <select
          id="mealReminderHour"
          name="mealReminderHour"
          defaultValue={defaults.mealReminderHour}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="weeklySummaryEnabled"
          defaultChecked={defaults.weeklySummaryEnabled}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Show me a weekly summary
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-warning">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : state.ok ? "Saved" : "Save reminder settings"}
      </button>
    </form>
  );
}
