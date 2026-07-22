import { prisma } from "@/lib/prisma";
import type { LogDraft } from "./draft";
import type { MealType } from "@/generated/prisma/enums";

/**
 * Persists a confirmed draft into today's log and recomputes daily totals.
 *
 * Totals are always recomputed from the stored entries rather than
 * incremented, so an edit or delete can never leave them drifting.
 */

const MEAL_TYPE_MAP: Record<string, MealType> = {
  breakfast: "BREAKFAST",
  lunch: "LUNCH",
  dinner: "DINNER",
  snack: "SNACK",
};

const CONFIDENCE_MAP = { high: "HIGH", medium: "MEDIUM", low: "LOW" } as const;

/** Parses a YYYY-MM-DD local date into a UTC-midnight Date for a @db.Date column. */
export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function getOrCreateDailyLog(userId: string, logDate: Date) {
  return prisma.dailyLog.upsert({
    where: { userId_logDate: { userId, logDate } },
    update: {},
    create: { userId, logDate },
  });
}

export async function saveDraft(
  userId: string,
  draft: LogDraft,
  logDate: Date,
  rawMessage: string,
) {
  const dailyLog = await getOrCreateDailyLog(userId, logDate);

  if (dailyLog.isFinalized) {
    throw new Error("That day is closed and can no longer be edited.");
  }

  const entries = draft.meals.flatMap((meal) =>
    meal.items.map((item) => ({
      dailyLogId: dailyLog.id,
      foodItemId: item.foodItemId,
      mealType: MEAL_TYPE_MAP[meal.mealType],
      rawInputText: rawMessage,
      quantity: item.quantity,
      unit: item.unit,
      caloriesKcal: item.caloriesKcal,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      extractionConfidence: CONFIDENCE_MAP[item.confidence],
      needsManualEntry: !item.matched,
    })),
  );

  await prisma.$transaction(async (tx) => {
    if (entries.length > 0) {
      await tx.mealEntry.createMany({ data: entries });
    }
    if (draft.waterMl > 0) {
      await tx.waterEntry.create({
        data: { dailyLogId: dailyLog.id, amountMl: draft.waterMl },
      });
    }
  });

  return recomputeTotals(dailyLog.id);
}

/** Recomputes a day's totals from its entries. Unmatched items add nothing. */
export async function recomputeTotals(dailyLogId: string) {
  const [meals, water] = await Promise.all([
    prisma.mealEntry.aggregate({
      where: { dailyLogId, needsManualEntry: false },
      _sum: { caloriesKcal: true, proteinG: true, carbsG: true, fatG: true },
    }),
    prisma.waterEntry.aggregate({
      where: { dailyLogId },
      _sum: { amountMl: true },
    }),
  ]);

  return prisma.dailyLog.update({
    where: { id: dailyLogId },
    data: {
      totalCalories: meals._sum.caloriesKcal ?? 0,
      totalProteinG: meals._sum.proteinG ?? 0,
      totalCarbsG: meals._sum.carbsG ?? 0,
      totalFatG: meals._sum.fatG ?? 0,
      totalWaterMl: water._sum.amountMl ?? 0,
    },
  });
}

/** Deletes a single entry and refreshes the day's totals. */
export async function deleteMealEntry(userId: string, entryId: string) {
  const entry = await prisma.mealEntry.findUnique({
    where: { id: entryId },
    include: { dailyLog: true },
  });
  // Ownership check — never trust an id straight from the client.
  if (!entry || entry.dailyLog.userId !== userId) {
    throw new Error("Entry not found.");
  }
  if (entry.dailyLog.isFinalized) {
    throw new Error("That day is closed and can no longer be edited.");
  }

  await prisma.mealEntry.delete({ where: { id: entryId } });
  return recomputeTotals(entry.dailyLogId);
}
