import { requireOnboardedUser } from "@/lib/user";

export const metadata = { title: "Today · NutriTrack AI" };

export default async function TodayPage() {
  const { user, profile } = await requireOnboardedUser();

  const targets: [string, string][] = [
    ["Calories", `${Math.round(profile.targetCalories)} kcal`],
    ["Protein", `${Math.round(profile.targetProteinG)} g`],
    ["Carbs", `${Math.round(profile.targetCarbsG)} g`],
    ["Fat", `${Math.round(profile.targetFatG)} g`],
    ["Water", `${profile.targetWaterMl} ml`],
  ];

  return (
    <section>
      <h1 className="text-2xl font-semibold">
        {user.fullName ? `Hi, ${user.fullName.split(" ")[0]}` : "Today"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Here are the targets we&apos;ll track against.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {targets.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 rounded-xl bg-surface p-5">
        <p className="text-sm font-medium text-primary">Phase 4 — Daily dashboard</p>
        <p className="mt-1 text-sm text-muted">
          Progress rings showing today&apos;s totals against these targets land
          once meal logging (Phase 2) and nutrition lookups (Phase 3) are wired up.
        </p>
      </div>
    </section>
  );
}
