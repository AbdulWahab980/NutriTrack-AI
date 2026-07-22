/**
 * Checks trend aggregation, streak logic, and trend-framed insights (spec §3.6).
 * Run with: npm run check:trends   (database only, no OpenAI)
 */
import "dotenv/config";
import { getTrendSummary, trendInsights, computeStreaks } from "../src/lib/trends";
import { prisma } from "../src/lib/prisma";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const TEST_UID = "00000000-0000-4000-8000-0000000d0d0d";
const TODAY = new Date(Date.UTC(2026, 6, 22)); // 2026-07-22
const targets = { targetCalories: 2400, targetProteinG: 120, targetWaterMl: 2500 };

function dayBefore(n: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function seedDay(
  userId: string,
  daysAgo: number,
  opts: { calories: number; protein: number; water: number; entries?: number },
) {
  const log = await prisma.dailyLog.create({
    data: {
      userId,
      logDate: dayBefore(daysAgo),
      totalCalories: opts.calories,
      totalProteinG: opts.protein,
      totalWaterMl: opts.water,
    },
  });
  for (let i = 0; i < (opts.entries ?? 1); i++) {
    await prisma.mealEntry.create({
      data: {
        dailyLogId: log.id, mealType: "LUNCH", foodName: "test food",
        rawInputText: "test", quantity: 1, unit: "plate",
        caloriesKcal: opts.calories, proteinG: opts.protein, carbsG: 0, fatG: 0,
      },
    });
  }
}

async function main() {
  await prisma.user.deleteMany({ where: { supabaseUserId: TEST_UID } });
  const user = await prisma.user.create({
    data: { supabaseUserId: TEST_UID, email: "trends-check@example.invalid" },
  });

  // Pattern: logged days 0,1,2 (current streak 3), gap at 3, then 4,5,6,7.
  // Water target (2500) met on days 0,1,4.
  await seedDay(user.id, 0, { calories: 2400, protein: 130, water: 2600 });
  await seedDay(user.id, 1, { calories: 2200, protein: 125, water: 2500 });
  await seedDay(user.id, 2, { calories: 1800, protein: 90, water: 1200 });
  // day 3: nothing
  await seedDay(user.id, 4, { calories: 2500, protein: 140, water: 2700 });
  await seedDay(user.id, 5, { calories: 1500, protein: 60, water: 800 });
  await seedDay(user.id, 6, { calories: 2350, protein: 110, water: 900 });
  await seedDay(user.id, 7, { calories: 2000, protein: 100, water: 1000 });

  const s = await getTrendSummary(user.id, TODAY, 7, targets);
  console.log("days in range:", s.days.length, "| logged:", s.daysLogged);
  console.log("streaks:", s.streaks);
  console.log(
    "hits -> protein:", s.proteinTargetHits,
    "water:", s.waterTargetHits,
    "calories:", s.calorieTargetHits,
  );
  console.log("averages:", { kcal: s.avgCalories, protein: s.avgProteinG, water: s.avgWaterMl });

  ok(s.days.length === 7, "7-day range returns 7 points");
  // Range covers days 0..6 ago; day 3 is empty, so 6 logged.
  ok(s.daysLogged === 6, `should count 6 logged days in range, got ${s.daysLogged}`);

  // Streaks
  ok(s.streaks.loggingCurrent === 3, `current logging streak should be 3, got ${s.streaks.loggingCurrent}`);
  ok(s.streaks.loggingLongest === 4, `longest logging streak should be 4, got ${s.streaks.loggingLongest}`);
  ok(s.streaks.waterCurrent === 2, `current water streak should be 2, got ${s.streaks.waterCurrent}`);

  // Target hits within the 7-day window (days 0..6):
  // protein >=120 on days 0,1,4 -> 3
  ok(s.proteinTargetHits === 3, `protein hits should be 3, got ${s.proteinTargetHits}`);
  // water >=2500 on days 0,1,4 -> 3
  ok(s.waterTargetHits === 3, `water hits should be 3, got ${s.waterTargetHits}`);
  // calories within 10% of 2400 (2160-2640): days 0(2400),1(2200),4(2500),6(2350) -> 4
  ok(s.calorieTargetHits === 4, `calorie hits should be 4, got ${s.calorieTargetHits}`);

  // Averages must exclude the unlogged day, not treat it as zero.
  const loggedCals = [2400, 2200, 1800, 2500, 1500, 2350];
  const expectedAvg = Math.round(loggedCals.reduce((a, b) => a + b, 0) / loggedCals.length);
  ok(
    s.avgCalories === expectedAvg,
    `average should exclude unlogged days (expected ${expectedAvg}, got ${s.avgCalories})`,
  );

  // Unlogged day must be marked so charts can gap it rather than plot zero.
  const gapDay = s.days.find((d) => d.iso === dayBefore(3).toISOString().slice(0, 10));
  ok(gapDay?.logged === false, "the unlogged day should be flagged as not logged");

  // --- streak tolerance: not logging *yet today* must not reset the streak ---
  await prisma.dailyLog.deleteMany({ where: { userId: user.id, logDate: dayBefore(0) } });
  const tolerant = await computeStreaks(user.id, TODAY, targets.targetWaterMl);
  console.log("streaks after removing today:", tolerant);
  ok(
    tolerant.loggingCurrent === 2,
    `an unlogged today should not reset the streak (expected 2, got ${tolerant.loggingCurrent})`,
  );

  // --- insights are trend-framed, never single-day verdicts ---
  const lines = trendInsights(s, 7);
  console.log("\ninsights:", lines);
  ok(lines.length > 0, "should produce insights when there is data");
  ok(
    lines.every((l) => /of the last \d+ days|averaged/.test(l)),
    "every insight must be framed over the range, not a single day",
  );
  for (const banned of ["healthy", "unhealthy", "bad", "failed", "good job", "should"]) {
    ok(
      !lines.join(" ").toLowerCase().includes(banned),
      `insights must not contain a verdict word: "${banned}"`,
    );
  }

  // Empty history produces no insights rather than a discouraging zero-report.
  ok(
    trendInsights({ ...s, daysLogged: 0 }, 7).length === 0,
    "no logs should produce no insights",
  );

  await prisma.user.delete({ where: { id: user.id } });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll trend checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
