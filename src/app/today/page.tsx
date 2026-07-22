import Link from "next/link";
import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getToday, getTimeZone, formatFriendlyDate } from "@/lib/date";
import { computeGaps, percentOf } from "@/lib/insights";
import { ProgressRing } from "@/components/ProgressRing";
import { TimezoneSync } from "@/components/TimezoneSync";
import { removeEntry } from "@/app/log/actions";

export const metadata = { title: "Today · NutriTrack AI" };

const MEAL_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export default async function TodayPage() {
  const { user, profile } = await requireOnboardedUser();
  const tz = await getTimeZone();
  const { iso, date } = await getToday();

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId: user.id, logDate: date } },
    include: {
      mealEntries: { orderBy: { loggedAt: "asc" } },
      waterEntries: { orderBy: { loggedAt: "asc" } },
    },
  });

  const totals = {
    caloriesKcal: dailyLog?.totalCalories ?? 0,
    proteinG: dailyLog?.totalProteinG ?? 0,
    carbsG: dailyLog?.totalCarbsG ?? 0,
    fatG: dailyLog?.totalFatG ?? 0,
    waterMl: dailyLog?.totalWaterMl ?? 0,
  };
  const hasData = (dailyLog?.mealEntries.length ?? 0) > 0 || totals.waterMl > 0;
  const gaps = hasData ? computeGaps(totals, profile) : [];

  const entriesByMeal = MEAL_ORDER.map((meal) => ({
    meal,
    entries: (dailyLog?.mealEntries ?? []).filter((e) => e.mealType === meal),
  })).filter((g) => g.entries.length > 0);

  return (
    <section>
      <TimezoneSync current={tz} />

      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {user.fullName ? `Hi, ${user.fullName.split(" ")[0]}` : "Today"}
        </h1>
        <p className="text-xs text-muted">{formatFriendlyDate(iso)}</p>
      </div>

      {/* --- rings --- */}
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-border p-5">
        <ProgressRing
          value={totals.caloriesKcal}
          target={profile.targetCalories}
          label="Calories"
          unit="kcal"
        />
        <ProgressRing
          value={totals.proteinG}
          target={profile.targetProteinG}
          label="Protein"
          unit="g"
        />
        <ProgressRing
          value={totals.waterMl}
          target={profile.targetWaterMl}
          label="Water"
          unit="ml"
        />
      </div>

      {/* --- macro bars --- */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(
          [
            ["Carbs", totals.carbsG, profile.targetCarbsG, "g"],
            ["Fat", totals.fatG, profile.targetFatG, "g"],
          ] as const
        ).map(([label, value, target, unit]) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">{label}</span>
              <span className="text-sm font-semibold">
                {Math.round(value)}
                <span className="text-xs font-normal text-muted">
                  {" "}/ {Math.round(target)}{unit}
                </span>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-track">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${percentOf(value, target)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* --- gaps --- */}
      {gaps.length > 0 && (
        <div className="mt-6 rounded-xl bg-surface p-5">
          <h2 className="text-sm font-semibold">Where you stand</h2>
          <ul className="mt-2 space-y-1">
            {gaps.map((g) => (
              <li key={g.label} className="text-sm text-muted">
                {g.text}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Specific suggestions to close these gaps arrive in Phase 5.
          </p>
        </div>
      )}

      {/* --- logged entries --- */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Logged today</h2>
          <Link href="/log" className="text-sm font-medium text-primary">
            + Add
          </Link>
        </div>

        {!hasData ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted">Nothing logged yet today.</p>
            <Link
              href="/log"
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Log your first meal
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {entriesByMeal.map(({ meal, entries }) => (
              <div key={meal} className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {meal.toLowerCase()}
                </p>
                <ul className="mt-2 divide-y divide-border">
                  {entries.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">
                          {e.quantity} {e.unit}{" "}
                          <span className="font-medium">{e.foodName}</span>
                        </span>
                        {e.needsManualEntry && (
                          <span className="text-xs text-warning">
                            no nutrition data — excluded from totals
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-medium">
                          {e.needsManualEntry ? "—" : `${Math.round(e.caloriesKcal)} kcal`}
                        </span>
                        <form action={removeEntry}>
                          <input type="hidden" name="entryId" value={e.id} />
                          <button
                            type="submit"
                            aria-label="Remove entry"
                            className="text-xs text-muted hover:text-warning"
                          >
                            Remove
                          </button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {totals.waterMl > 0 && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  water
                </p>
                <p className="mt-1.5 text-sm">{totals.waterMl} ml total</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
