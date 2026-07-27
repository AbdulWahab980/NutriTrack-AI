import { prisma } from "@/lib/prisma";
import { getOrCreateDailyLog, recomputeTotals } from "./persist";

/**
 * Direct water logging (the Water screen), separate from the meal-logging
 * conversation. Both write WaterEntry rows against the same daily log, so the
 * screens share daily_logs.total_water_ml — logging water in chat and logging
 * it here both count toward the same daily total.
 */

export const MAX_SINGLE_ADD_ML = 5000;

/** Adds a water entry for the given day and returns the refreshed daily log. */
export async function logWaterForUser(
  userId: string,
  amountMl: number,
  logDate: Date,
) {
  if (!Number.isInteger(amountMl) || amountMl <= 0 || amountMl > MAX_SINGLE_ADD_ML) {
    throw new Error("Enter a water amount between 1 and 5000 ml.");
  }

  const dailyLog = await getOrCreateDailyLog(userId, logDate);
  if (dailyLog.isFinalized) {
    throw new Error("That day is closed and can no longer be edited.");
  }

  await prisma.waterEntry.create({
    data: { dailyLogId: dailyLog.id, amountMl },
  });
  return recomputeTotals(dailyLog.id);
}

/** Deletes a water entry (with ownership check) and refreshes totals. */
export async function removeWaterForUser(userId: string, entryId: string) {
  const entry = await prisma.waterEntry.findUnique({
    where: { id: entryId },
    include: { dailyLog: true },
  });
  if (!entry || entry.dailyLog.userId !== userId) {
    throw new Error("Entry not found.");
  }
  if (entry.dailyLog.isFinalized) {
    throw new Error("That day is closed and can no longer be edited.");
  }

  await prisma.waterEntry.delete({ where: { id: entryId } });
  return recomputeTotals(entry.dailyLogId);
}
