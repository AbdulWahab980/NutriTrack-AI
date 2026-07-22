import Link from "next/link";
import { requireOnboardedUser } from "@/lib/user";
import { getToday } from "@/lib/date";
import { getTrendSummary, trendInsights } from "@/lib/trends";
import { TrendChart } from "@/components/TrendChart";
import { WeightLogger } from "@/components/WeightLogger";

export const metadata = { title: "Trends · NutriTrack AI" };

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { user, profile } = await requireOnboardedUser();
  const { date } = await getToday();

  const requested = Number((await searchParams).range);
  const rangeDays = RANGES.some((r) => r.days === requested) ? requested : 7;

  const summary = await getTrendSummary(user.id, date, rangeDays, profile);
  const insights = trendInsights(summary, rangeDays);
  const latestWeight = [...summary.days].reverse().find((d) => d.weightKg !== null);

  const streakCards: [string, number, number][] = [
    ["Logging streak", summary.streaks.loggingCurrent, summary.streaks.loggingLongest],
    ["Water streak", summary.streaks.waterCurrent, summary.streaks.waterLongest],
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trends</h1>
        <p className="mt-1 text-sm text-muted">
          Patterns over time — never a verdict on any single day.
        </p>
      </div>

      {/* --- range selector --- */}
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.days}
            href={`/trends?range=${r.days}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              r.days === rangeDays
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {summary.daysLogged === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No logs in the last {rangeDays} days yet.
          </p>
          <Link
            href="/log"
            className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Log a meal
          </Link>
        </div>
      ) : (
        <>
          {/* --- streaks --- */}
          <div className="grid grid-cols-2 gap-3">
            {streakCards.map(([label, current, longest]) => (
              <div key={label} className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-0.5 text-2xl font-semibold text-primary">
                  {current}
                  <span className="ml-1 text-sm font-normal text-muted">
                    day{current === 1 ? "" : "s"}
                  </span>
                </p>
                <p className="text-[11px] text-muted">Best: {longest}</p>
              </div>
            ))}
          </div>

          {/* --- insights --- */}
          <div className="rounded-xl bg-surface p-5">
            <h2 className="text-sm font-semibold">Your patterns</h2>
            <ul className="mt-2 space-y-1">
              {insights.map((line) => (
                <li key={line} className="text-sm text-muted">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* --- charts --- */}
          <div className="space-y-4">
            {(
              [
                ["Calories", "calories", profile.targetCalories, "kcal"],
                ["Protein", "proteinG", profile.targetProteinG, "g"],
                ["Water", "waterMl", profile.targetWaterMl, "ml"],
              ] as const
            ).map(([label, key, target, unit]) => (
              <div key={key} className="rounded-xl border border-border p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="text-xs text-muted">
                    target {Math.round(target)} {unit}
                  </span>
                </div>
                <div className="mt-2">
                  <TrendChart days={summary.days} dataKey={key} target={target} unit={unit} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- weight --- */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Weight</h3>
          <span className="text-xs text-muted">
            {latestWeight?.weightKg
              ? `latest ${latestWeight.weightKg} kg`
              : "not logged yet"}
          </span>
        </div>
        {latestWeight && (
          <div className="mt-2">
            <TrendChart days={summary.days} dataKey="weightKg" unit="kg" />
          </div>
        )}
        <WeightLogger current={latestWeight?.weightKg ?? profile.weightKg} />
        <p className="mt-2 text-[11px] text-muted">
          Optional. Logging weight is entirely up to you — it isn&apos;t needed
          for anything else in the app to work.
        </p>
      </div>
    </section>
  );
}
