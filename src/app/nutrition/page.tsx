import Link from "next/link";
import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getToday, getTimeZone, formatFriendlyDate } from "@/lib/date";
import { parseLocalDate } from "@/lib/log/persist";
import { percentOf } from "@/lib/insights";
import { ProgressRing } from "@/components/ProgressRing";

export const metadata = { title: "Nutrition · NutriTrack AI" };

const MEAL_ORDER = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
const MEAL_EMOJI: Record<string, string> = {
  BREAKFAST: "🥣", LUNCH: "🍚", DINNER: "🍽️", SNACK: "🍎",
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function shiftIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/**
 * Nutrition: a detailed, single-day, item-level view of ONE day.
 * daily_logs + meal_entries for that date only — no aggregation, no
 * multi-day charts. For patterns over time, that's the Trends page.
 */
export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { user, profile } = await requireOnboardedUser();
  const tz = await getTimeZone();
  const { iso: todayIso } = await getToday();

  const requested = (await searchParams).date;
  // Default to today; never allow a future date.
  let iso = requested && ISO.test(requested) ? requested : todayIso;
  if (iso > todayIso) iso = todayIso;

  const dayDate = parseLocalDate(iso);
  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId: user.id, logDate: dayDate } },
    include: {
      mealEntries: { orderBy: { loggedAt: "asc" } },
      aiFeedback: { orderBy: { createdAt: "desc" } },
    },
  });

  const totals = {
    caloriesKcal: dailyLog?.totalCalories ?? 0,
    proteinG: dailyLog?.totalProteinG ?? 0,
    carbsG: dailyLog?.totalCarbsG ?? 0,
    fatG: dailyLog?.totalFatG ?? 0,
    waterMl: dailyLog?.totalWaterMl ?? 0,
  };
  const entries = dailyLog?.mealEntries ?? [];
  const feedback = (dailyLog?.aiFeedback ?? []).find((f) => !f.flaggedDisorderedEating);

  const byMeal = MEAL_ORDER.map((meal) => {
    const items = entries.filter((e) => e.mealType === meal);
    return {
      meal,
      items,
      kcal: items.reduce((s, e) => s + (e.needsManualEntry ? 0 : e.caloriesKcal), 0),
    };
  }).filter((g) => g.items.length > 0);

  const prevIso = shiftIso(iso, -1);
  const nextIso = shiftIso(iso, 1);
  const atToday = iso >= todayIso;
  const time = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <p className="mt-1 text-sm text-muted">
          A detailed look at a single day. For patterns over time, see{" "}
          <Link href="/trends" className="font-medium text-primary">Trends</Link>.
        </p>
      </div>

      {/* --- day navigator --- */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <Link
          href={`/nutrition?date=${prevIso}`}
          aria-label="Previous day"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:text-primary"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold">{iso === todayIso ? "Today" : formatFriendlyDate(iso)}</p>
          {iso === todayIso && <p className="text-xs text-muted">{formatFriendlyDate(iso)}</p>}
        </div>
        <Link
          href={atToday ? "#" : `/nutrition?date=${nextIso}`}
          aria-label="Next day"
          aria-disabled={atToday}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border ${
            atToday ? "pointer-events-none opacity-40" : "text-muted hover:text-primary"
          }`}
        >
          ›
        </Link>
      </div>

      {/* --- totals vs targets --- */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Totals vs targets</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ProgressRing value={totals.caloriesKcal} target={profile.targetCalories} label="Calories" unit="kcal" />
          <ProgressRing value={totals.proteinG} target={profile.targetProteinG} label="Protein" unit="g" />
          <ProgressRing value={totals.waterMl} target={profile.targetWaterMl} label="Water" unit="ml" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {([["Carbs", totals.carbsG, profile.targetCarbsG], ["Fat", totals.fatG, profile.targetFatG]] as const).map(
            ([label, value, target]) => (
              <div key={label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">{label}</span>
                  <span className="font-semibold">
                    {Math.round(value)}
                    <span className="font-normal text-muted"> / {Math.round(target)}g</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-track">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${percentOf(value, target)}%` }} />
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* --- meal breakdown (expandable) --- */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Meals</h2>
        {byMeal.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted">Nothing logged on this day.</p>
            {iso === todayIso && (
              <Link href="/log" className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Log a meal
              </Link>
            )}
          </div>
        ) : (
          byMeal.map(({ meal, items, kcal }) => (
            <details key={meal} className="rounded-2xl border border-border bg-card" open>
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden>{MEAL_EMOJI[meal]}</span>
                  <span className="capitalize">{meal.toLowerCase()}</span>
                  <span className="text-xs font-normal text-muted">
                    · {items.length} item{items.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="text-sm font-semibold text-primary">{Math.round(kcal)} kcal</span>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {items.map((e) => (
                  <li key={e.id} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium capitalize">
                        {e.quantity} {e.unit} {e.foodName}
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {e.needsManualEntry ? "—" : `${Math.round(e.caloriesKcal)} kcal`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {Math.round(e.proteinG)}g P · {Math.round(e.carbsG)}g C · {Math.round(e.fatG)}g F
                      {" · "}logged {time(e.loggedAt)}
                      {e.needsManualEntry && <span className="text-warning"> · no nutrition data</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          ))
        )}

        {totals.waterMl > 0 && (
          <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm">
            <span className="font-semibold">💧 Water</span>
            <span className="ml-2 text-muted">{totals.waterMl} ml total</span>
          </div>
        )}
      </div>

      {/* --- that day's AI feedback --- */}
      {feedback && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-primary">Coach&apos;s note for this day</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{feedback.feedbackText}</p>
        </div>
      )}
    </div>
  );
}
