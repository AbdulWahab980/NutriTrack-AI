import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { saveProfile } from "@/app/onboarding/actions";
import { requireOnboardedUser } from "@/lib/user";
import { logout } from "@/app/auth/actions";

export const metadata = { title: "Profile · NutriTrack AI" };

export default async function ProfilePage() {
  const { user, profile } = await requireOnboardedUser();

  const targets: [string, string][] = [
    ["Calories", `${Math.round(profile.targetCalories)} kcal`],
    ["Protein", `${Math.round(profile.targetProteinG)} g`],
    ["Carbs", `${Math.round(profile.targetCarbsG)} g`],
    ["Fat", `${Math.round(profile.targetFatG)} g`],
    ["Water", `${profile.targetWaterMl} ml`],
  ];

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
      </div>

      <div className="rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Your daily targets</h2>
        <p className="mt-1 text-xs text-muted">
          Calculated from your profile — BMR {Math.round(profile.bmrKcal)} kcal,
          TDEE {Math.round(profile.tdeeKcal)} kcal. Recalculated whenever you
          update your details below.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {targets.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-sm font-semibold text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h2 className="text-sm font-semibold">Edit your details</h2>
        <div className="mt-4">
          <ProfileForm
            action={saveProfile}
            submitLabel="Save changes"
            defaults={{
              fullName: user.fullName,
              age: profile.age,
              gender: profile.gender,
              heightCm: profile.heightCm,
              weightKg: profile.weightKg,
              activityLevel: profile.activityLevel,
              goal: profile.goal,
              livingSituation: profile.livingSituation,
              dailyFoodBudgetPkr: profile.dailyFoodBudgetPkr,
              hasMessPlan: profile.hasMessPlan,
              messNotes: profile.messNotes,
              kitchenAccess: profile.kitchenAccess,
              dietaryRestrictions: profile.dietaryRestrictions,
            }}
          />
        </div>
      </div>

      <Link
        href="/settings"
        className="flex items-center justify-between rounded-xl border border-border p-5"
      >
        <span>
          <span className="block text-sm font-semibold">Settings</span>
          <span className="mt-0.5 block text-xs text-muted">
            Reminders, data export, and account deletion
          </span>
        </span>
        <span aria-hidden className="text-muted">
          &rarr;
        </span>
      </Link>

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}
