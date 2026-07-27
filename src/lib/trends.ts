import { prisma } from "@/lib/prisma";

/**
 * Trend data, streaks, and trend-framed insights (spec §3.6).
 *
 * Everything here is deliberately framed over a range of days. The product
 * never renders a verdict on a single day — "3 of the last 7" is a pattern,
 * "you failed yesterday" is a judgement.
 */

export type DayPoint = {
  iso: string;
  /** Short label for chart axes, e.g. "22 Jul". */
  label: string;
  calories: number;
  proteinG: number;
  waterMl: number;
  weightKg: number | null;
  logged: boolean;
};

export type Streaks = {
  loggingCurrent: number;
  loggingLongest: number;
  waterCurrent: number;
  waterLongest: number;
};

export type TrendSummary = {
  days: DayPoint[];
  streaks: Streaks;
  /** Days with any log, out of the range. */
  daysLogged: number;
  proteinTargetHits: number;
  waterTargetHits: number;
  calorieTargetHits: number;
  /** Averages across logged days only — empty days would skew them to zero. */
  avgCalories: number;
  avgProteinG: number;
  avgWaterMl: number;
};

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function labelOf(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso + "T00:00:00Z"));
}

/** Within 10% of the calorie target counts as hitting it. */
const CALORIE_TOLERANCE = 0.1;

export async function getTrendSummary(
  userId: string,
  endDate: Date,
  rangeDays: number,
  targets: { targetCalories: number; targetProteinG: number; targetWaterMl: number },
): Promise<TrendSummary> {
  const start = new Date(endDate);
  start.setUTCDate(start.getUTCDate() - (rangeDays - 1));

  // Trends is aggregate-only: it reads daily_logs across a range and never
  // joins meal_entries. "Logged" is derived from the day's stored totals.
  const [logs, weights] = await Promise.all([
    prisma.dailyLog.findMany({
      where: { userId, logDate: { gte: start, lte: endDate } },
    }),
    prisma.weightEntry.findMany({
      where: { userId, logDate: { gte: start, lte: endDate } },
    }),
  ]);

  const logByDate = new Map(logs.map((l) => [isoOf(l.logDate), l]));
  const weightByDate = new Map(weights.map((w) => [isoOf(w.logDate), w.weightKg]));

  const days: DayPoint[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = isoOf(d);
    const log = logByDate.get(iso);

    days.push({
      iso,
      label: labelOf(iso),
      calories: log?.totalCalories ?? 0,
      proteinG: log?.totalProteinG ?? 0,
      waterMl: log?.totalWaterMl ?? 0,
      weightKg: weightByDate.get(iso) ?? null,
      logged: (log?.totalCalories ?? 0) > 0 || (log?.totalWaterMl ?? 0) > 0,
    });
  }

  const loggedDays = days.filter((d) => d.logged);
  const avg = (pick: (d: DayPoint) => number) =>
    loggedDays.length === 0
      ? 0
      : Math.round(loggedDays.reduce((s, d) => s + pick(d), 0) / loggedDays.length);

  return {
    days,
    streaks: await computeStreaks(userId, endDate, targets.targetWaterMl),
    daysLogged: loggedDays.length,
    proteinTargetHits: loggedDays.filter((d) => d.proteinG >= targets.targetProteinG).length,
    waterTargetHits: loggedDays.filter((d) => d.waterMl >= targets.targetWaterMl).length,
    calorieTargetHits: loggedDays.filter(
      (d) =>
        Math.abs(d.calories - targets.targetCalories) <=
        targets.targetCalories * CALORIE_TOLERANCE,
    ).length,
    avgCalories: avg((d) => d.calories),
    avgProteinG: avg((d) => d.proteinG),
    avgWaterMl: avg((d) => d.waterMl),
  };
}

/**
 * Streaks over the last 90 days.
 *
 * A current streak may end today or yesterday — a user who hasn't logged yet
 * today shouldn't see their streak reset before the day is over.
 */
export async function computeStreaks(
  userId: string,
  endDate: Date,
  waterTargetMl: number,
): Promise<Streaks> {
  const start = new Date(endDate);
  start.setUTCDate(start.getUTCDate() - 89);

  const logs = await prisma.dailyLog.findMany({
    where: { userId, logDate: { gte: start, lte: endDate } },
    orderBy: { logDate: "asc" },
  });

  const logged = new Set<string>();
  const hitWater = new Set<string>();
  for (const l of logs) {
    const iso = isoOf(l.logDate);
    if (l.totalCalories > 0 || l.totalWaterMl > 0) logged.add(iso);
    if (l.totalWaterMl >= waterTargetMl && waterTargetMl > 0) hitWater.add(iso);
  }

  const run = (set: Set<string>) => {
    let longest = 0;
    let current = 0;
    let streak = 0;

    for (let i = 0; i < 90; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      streak = set.has(isoOf(d)) ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }

    // Current streak: walk back from today, tolerating an unlogged today.
    const cursor = new Date(endDate);
    if (!set.has(isoOf(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (set.has(isoOf(cursor))) {
      current++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return { current, longest };
  };

  const loggingRun = run(logged);
  const waterRun = run(hitWater);

  return {
    loggingCurrent: loggingRun.current,
    loggingLongest: loggingRun.longest,
    waterCurrent: waterRun.current,
    waterLongest: waterRun.longest,
  };
}

/**
 * Trend-framed statements. Never about a single day, never a verdict —
 * patterns and counts only (spec §3.6).
 */
export function trendInsights(summary: TrendSummary, rangeDays: number): string[] {
  if (summary.daysLogged === 0) return [];

  const out: string[] = [];
  const n = rangeDays;

  out.push(
    `You logged on ${summary.daysLogged} of the last ${n} days.`,
  );
  out.push(
    `You hit your protein target on ${summary.proteinTargetHits} of the last ${n} days.`,
  );
  out.push(
    `You reached your water target on ${summary.waterTargetHits} of the last ${n} days.`,
  );

  if (summary.daysLogged >= 3) {
    out.push(
      `Across logged days you averaged ${summary.avgCalories} kcal and ${summary.avgProteinG}g protein.`,
    );
  }

  return out;
}
