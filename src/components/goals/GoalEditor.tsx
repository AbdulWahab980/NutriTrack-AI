"use client";

import { useActionState } from "react";
import { updateGoal, type GoalState } from "@/app/goals/actions";

const GOALS = [
  ["WEIGHT_LOSS", "Weight loss"],
  ["MUSCLE_GAIN", "Muscle gain"],
  ["MAINTENANCE", "Maintenance"],
  ["GENERAL_HEALTH", "General health"],
] as const;

const ACTIVITY = [
  ["SEDENTARY", "Sedentary — little or no exercise"],
  ["LIGHT", "Light — 1-3 days/week"],
  ["MODERATE", "Moderate — 3-5 days/week"],
  ["ACTIVE", "Active — 6-7 days/week"],
  ["VERY_ACTIVE", "Very active — physical job or 2x/day"],
] as const;

export function GoalEditor({
  goal,
  activityLevel,
}: {
  goal: string;
  activityLevel: string;
}) {
  const [state, action, pending] = useActionState<GoalState, FormData>(
    updateGoal,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <p className="text-sm font-medium">Goal</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GOALS.map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-surface has-[:checked]:text-primary"
            >
              <input
                type="radio"
                name="goal"
                value={value}
                defaultChecked={goal === value}
                className="accent-[var(--primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="activityLevel" className="block text-sm font-medium">
          Activity level
        </label>
        <select
          id="activityLevel"
          name="activityLevel"
          defaultValue={activityLevel}
          className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {ACTIVITY.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted">
        Changing these recalculates your calorie, macro, and water targets.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-warning">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Recalculating…" : state.ok ? "Saved ✓" : "Save & recalculate"}
      </button>
    </form>
  );
}
