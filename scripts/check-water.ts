/**
 * Verifies direct water logging (Bug 1) against the real database:
 * adds count toward daily_logs.total_water_ml (the same total meal-logging
 * writes to), removal decrements it, and validation rejects bad amounts.
 * Run with: npm run check:water
 */
import "dotenv/config";
import { logWaterForUser, removeWaterForUser } from "../src/lib/log/water";
import { prisma } from "../src/lib/prisma";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const UID = "00000000-0000-4000-8000-00000000wa7e".replace("wa7e", "a17e");
const DATE = new Date(Date.UTC(2026, 6, 25));

async function main() {
  await prisma.user.deleteMany({ where: { supabaseUserId: UID } });
  const user = await prisma.user.create({
    data: { supabaseUserId: UID, email: "water-check@example.invalid" },
  });

  // Two quick adds accumulate into one daily total.
  let log = await logWaterForUser(user.id, 250, DATE);
  log = await logWaterForUser(user.id, 500, DATE);
  console.log("after +250 +500:", log.totalWaterMl, "ml");
  ok(log.totalWaterMl === 750, `total should be 750, got ${log.totalWaterMl}`);

  // Shares the same daily log row as meals — verify only one exists.
  const dayCount = await prisma.dailyLog.count({ where: { userId: user.id } });
  ok(dayCount === 1, `should reuse one daily log, got ${dayCount}`);

  // Water written by the meal flow should sit in the same total.
  const dl = await prisma.dailyLog.findFirstOrThrow({ where: { userId: user.id } });
  await prisma.waterEntry.create({ data: { dailyLogId: dl.id, amountMl: 300 } });
  const { recomputeTotals } = await import("../src/lib/log/persist");
  const merged = await recomputeTotals(dl.id);
  ok(merged.totalWaterMl === 1050, `meal-logged water should merge to 1050, got ${merged.totalWaterMl}`);

  // Remove one entry -> total drops.
  const entries = await prisma.waterEntry.findMany({ where: { dailyLogId: dl.id }, orderBy: { amountMl: "asc" } });
  const afterRemove = await removeWaterForUser(user.id, entries[0].id); // removes 250
  console.log("after removing 250:", afterRemove.totalWaterMl, "ml");
  ok(afterRemove.totalWaterMl === 800, `after removing 250 should be 800, got ${afterRemove.totalWaterMl}`);

  // Ownership: another user cannot delete this entry.
  const other = await prisma.user.create({
    data: { supabaseUserId: UID + "b", email: "water-other@example.invalid" },
  });
  let denied = false;
  try {
    await removeWaterForUser(other.id, entries[1].id);
  } catch {
    denied = true;
  }
  ok(denied, "a different user must not be able to remove someone's water entry");

  // Validation: reject non-positive and oversized amounts.
  for (const bad of [0, -100, 6000, 1.5]) {
    let rejected = false;
    try {
      await logWaterForUser(user.id, bad, DATE);
    } catch {
      rejected = true;
    }
    ok(rejected, `amount ${bad} should be rejected`);
  }

  await prisma.user.deleteMany({ where: { id: { in: [user.id, other.id] } } });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll water checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
