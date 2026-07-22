import { prisma } from "@/lib/prisma";

/**
 * Weekly hostel meal-budget tracking (spec §3.5).
 *
 * Spend is the sum of reference costs snapshotted when each item was logged.
 * Items with no known price contribute nothing and are counted separately, so
 * the figure is never quietly inflated by guesses.
 */

export type DaySpend = {
  iso: string;
  spentPkr: number;
  unpricedItems: number;
};

export type WeeklyBudget = {
  days: DaySpend[];
  totalPkr: number;
  budgetPkr: number | null;
  weeklyBudgetPkr: number | null;
  unpricedItems: number;
  /** Days with at least one logged entry — the honest denominator. */
  daysLogged: number;
};

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Last 7 days ending on `endDate` (inclusive), oldest first. */
export async function getWeeklyBudget(
  userId: string,
  endDate: Date,
  dailyBudgetPkr: number | null,
): Promise<WeeklyBudget> {
  const start = new Date(endDate);
  start.setUTCDate(start.getUTCDate() - 6);

  const logs = await prisma.dailyLog.findMany({
    where: { userId, logDate: { gte: start, lte: endDate } },
    include: {
      mealEntries: { select: { estimatedCostPkr: true } },
    },
  });

  const byDate = new Map(logs.map((l) => [isoOf(l.logDate), l]));

  const days: DaySpend[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = isoOf(d);
    const log = byDate.get(iso);

    const entries = log?.mealEntries ?? [];
    days.push({
      iso,
      spentPkr: entries.reduce((s, e) => s + (e.estimatedCostPkr ?? 0), 0),
      unpricedItems: entries.filter((e) => e.estimatedCostPkr === null).length,
    });
  }

  return {
    days,
    totalPkr: Math.round(days.reduce((s, d) => s + d.spentPkr, 0)),
    budgetPkr: dailyBudgetPkr,
    weeklyBudgetPkr: dailyBudgetPkr === null ? null : dailyBudgetPkr * 7,
    unpricedItems: days.reduce((s, d) => s + d.unpricedItems, 0),
    daysLogged: days.filter((d) => d.spentPkr > 0 || d.unpricedItems > 0).length,
  };
}

/** Today's spend only — used to work out remaining budget for suggestions. */
export async function getSpendForDate(userId: string, date: Date): Promise<number> {
  const log = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId, logDate: date } },
    include: { mealEntries: { select: { estimatedCostPkr: true } } },
  });
  if (!log) return 0;
  return log.mealEntries.reduce((s, e) => s + (e.estimatedCostPkr ?? 0), 0);
}
