"use client";

import { useActionState, useState } from "react";
import type { OnboardingState } from "@/app/onboarding/actions";

const field =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary";
const legend = "text-sm font-semibold";

const ACTIVITY_OPTIONS = [
  ["SEDENTARY", "Sedentary — little or no exercise"],
  ["LIGHT", "Light — 1-3 days/week"],
  ["MODERATE", "Moderate — 3-5 days/week"],
  ["ACTIVE", "Active — 6-7 days/week"],
  ["VERY_ACTIVE", "Very active — physical job or 2x/day"],
] as const;

const GOAL_OPTIONS = [
  ["WEIGHT_LOSS", "Weight loss"],
  ["MUSCLE_GAIN", "Muscle gain"],
  ["MAINTENANCE", "Maintenance"],
  ["GENERAL_HEALTH", "General health"],
] as const;

const GENDER_OPTIONS = [
  ["MALE", "Male"],
  ["FEMALE", "Female"],
  ["OTHER", "Other"],
  ["PREFER_NOT_TO_SAY", "Prefer not to say"],
] as const;

const LIVING_OPTIONS = [
  ["HOSTEL", "Hostel"],
  ["HOME", "Home"],
  ["PG", "PG"],
  ["OTHER", "Other"],
] as const;

const KITCHEN_OPTIONS = [
  ["NONE", "No kitchen access"],
  ["FRIDGE_ONLY", "Fridge only"],
  ["KETTLE", "Kettle"],
  ["INDUCTION", "Induction stove"],
] as const;

const RESTRICTION_OPTIONS = [
  "vegetarian",
  "vegan",
  "halal",
  "lactose_intolerant",
  "nut_allergy",
  "gluten_free",
];

export type ProfileDefaults = {
  fullName?: string | null;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: string;
  goal?: string;
  livingSituation?: string;
  dailyFoodBudgetPkr?: number | null;
  hasMessPlan?: boolean | null;
  messNotes?: string | null;
  kitchenAccess?: string | null;
  dietaryRestrictions?: string[];
};

export function ProfileForm({
  action,
  defaults = {},
  submitLabel = "Save and continue",
}: {
  action: (state: OnboardingState, formData: FormData) => Promise<OnboardingState>;
  defaults?: ProfileDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    action,
    {},
  );
  const [living, setLiving] = useState(defaults.livingSituation ?? "HOSTEL");
  const isHostel = living === "HOSTEL";

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className={legend}>About you</legend>

        <div>
          <label htmlFor="fullName" className="block text-sm">Name</label>
          <input id="fullName" name="fullName" required maxLength={150}
            defaultValue={defaults.fullName ?? ""} className={field} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="age" className="block text-sm">Age</label>
            <input id="age" name="age" type="number" required min={10} max={100}
              defaultValue={defaults.age} className={field} />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm">Gender</label>
            <select id="gender" name="gender" required
              defaultValue={defaults.gender ?? ""} className={field}>
              <option value="" disabled>Select…</option>
              {GENDER_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="heightCm" className="block text-sm">Height (cm)</label>
            <input id="heightCm" name="heightCm" type="number" step="0.1" required
              min={80} max={250} defaultValue={defaults.heightCm} className={field} />
          </div>
          <div>
            <label htmlFor="weightKg" className="block text-sm">Weight (kg)</label>
            <input id="weightKg" name="weightKg" type="number" step="0.1" required
              min={20} max={400} defaultValue={defaults.weightKg} className={field} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={legend}>Activity and goal</legend>
        <div>
          <label htmlFor="activityLevel" className="block text-sm">Activity level</label>
          <select id="activityLevel" name="activityLevel" required
            defaultValue={defaults.activityLevel ?? ""} className={field}>
            <option value="" disabled>Select…</option>
            {ACTIVITY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="goal" className="block text-sm">Goal</label>
          <select id="goal" name="goal" required
            defaultValue={defaults.goal ?? ""} className={field}>
            <option value="" disabled>Select…</option>
            {GOAL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className={legend}>Where you live</legend>
        <div>
          <label htmlFor="livingSituation" className="block text-sm">Living situation</label>
          <select id="livingSituation" name="livingSituation" required value={living}
            onChange={(e) => setLiving(e.target.value)} className={field}>
            {LIVING_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {isHostel && (
          <div className="space-y-4 rounded-xl bg-surface p-4">
            <p className="text-xs text-muted">
              Hostel mode tailors suggestions to your budget and what you can
              actually cook or buy.
            </p>

            <div>
              <label htmlFor="dailyFoodBudgetPkr" className="block text-sm">
                Daily food budget (PKR)
              </label>
              <input id="dailyFoodBudgetPkr" name="dailyFoodBudgetPkr" type="number"
                min={0} max={100000} step="10"
                defaultValue={defaults.dailyFoodBudgetPkr ?? ""} className={field} />
            </div>

            <div>
              <label htmlFor="kitchenAccess" className="block text-sm">Kitchen access</label>
              <select id="kitchenAccess" name="kitchenAccess"
                defaultValue={defaults.kitchenAccess ?? ""} className={field}>
                <option value="" disabled>Select…</option>
                {KITCHEN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="hasMessPlan"
                defaultChecked={defaults.hasMessPlan ?? false}
                className="h-4 w-4 accent-[var(--primary)]" />
              I have a mess meal plan
            </label>

            <div>
              <label htmlFor="messNotes" className="block text-sm">
                What does your mess usually serve? <span className="text-muted">(optional)</span>
              </label>
              <textarea id="messNotes" name="messNotes" rows={2} maxLength={1000}
                defaultValue={defaults.messNotes ?? ""} className={field}
                placeholder="e.g. roti and daal most nights, chicken twice a week" />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className={legend}>Dietary restrictions</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {RESTRICTION_OPTIONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="dietaryRestrictions" value={r}
                defaultChecked={defaults.dietaryRestrictions?.includes(r)}
                className="h-4 w-4 accent-[var(--primary)]" />
              {r.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-warning">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
