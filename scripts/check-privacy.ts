/**
 * Checks reminder nudges, CSV export completeness/escaping, and that account
 * deletion actually removes every related row (spec §3.7, §4).
 * Run with: npm run check:privacy
 */
import "dotenv/config";
import { computeNudges } from "../src/lib/reminders";
import { buildExportCsv } from "../src/lib/privacy/export";
import { prisma } from "../src/lib/prisma";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const on = {
  waterRemindersEnabled: true,
  mealRemindersEnabled: true,
  mealReminderHour: 20,
};

const TEST_UID = "00000000-0000-4000-8000-00000000fade";

async function main() {
  // ---------- nudges ----------
  // Midday, barely any water -> should nudge.
  const behind = computeNudges({
    localHour: 14, waterMl: 200, waterTargetMl: 2500,
    hasLoggedFood: true, settings: on,
  });
  console.log("behind on water:", behind.map((n) => n.text));
  ok(behind.some((n) => n.kind === "water"), "should nudge when far behind on water");

  // On pace -> no nudge.
  const onPace = computeNudges({
    localHour: 14, waterMl: 1300, waterTargetMl: 2500,
    hasLoggedFood: true, settings: on,
  });
  ok(onPace.length === 0, `on-pace user should get no nudge, got ${onPace.length}`);

  // Early morning -> no nudge even at zero (nobody drinks 2L before 8am).
  const earlyMorning = computeNudges({
    localHour: 7, waterMl: 0, waterTargetMl: 2500,
    hasLoggedFood: true, settings: on,
  });
  ok(earlyMorning.length === 0, "should not nudge at the start of the day");

  // Unlogged day before the reminder hour -> quiet; after -> nudge.
  const beforeHour = computeNudges({
    localHour: 15, waterMl: 2500, waterTargetMl: 2500,
    hasLoggedFood: false, settings: on,
  });
  ok(!beforeHour.some((n) => n.kind === "meal"), "no meal nudge before the set hour");

  const afterHour = computeNudges({
    localHour: 21, waterMl: 2500, waterTargetMl: 2500,
    hasLoggedFood: false, settings: on,
  });
  ok(afterHour.some((n) => n.kind === "meal"), "meal nudge after the set hour");
  console.log("unlogged evening:", afterHour.map((n) => n.text));

  // Disabled settings must silence them entirely.
  const disabled = computeNudges({
    localHour: 21, waterMl: 0, waterTargetMl: 2500, hasLoggedFood: false,
    settings: { waterRemindersEnabled: false, mealRemindersEnabled: false, mealReminderHour: 20 },
  });
  ok(disabled.length === 0, "disabled reminders must produce no nudges");

  // ---------- export + deletion ----------
  await prisma.user.deleteMany({ where: { supabaseUserId: TEST_UID } });
  const user = await prisma.user.create({
    data: {
      supabaseUserId: TEST_UID,
      email: "privacy-check@example.invalid",
      fullName: "Test, \"Quoted\" User", // deliberately awkward for CSV
      profile: {
        create: {
          age: 21, gender: "MALE", heightCm: 175, weightKg: 68,
          activityLevel: "MODERATE", goal: "MUSCLE_GAIN", livingSituation: "HOSTEL",
          dailyFoodBudgetPkr: 500, kitchenAccess: "KETTLE", hasMessPlan: true,
          dietaryRestrictions: ["vegetarian"],
          bmrKcal: 1673.8, tdeeKcal: 2594.3, targetCalories: 2894.3,
          targetProteinG: 122.4, targetCarbsG: 420.3, targetFatG: 80.4,
          targetWaterMl: 2400,
        },
      },
    },
  });

  const log = await prisma.dailyLog.create({
    data: {
      userId: user.id, logDate: new Date(Date.UTC(2026, 6, 22)),
      totalCalories: 1110, totalProteinG: 28.5, totalWaterMl: 1500,
    },
  });
  await prisma.mealEntry.create({
    data: {
      dailyLogId: log.id, mealType: "BREAKFAST",
      foodName: "paratha, with butter", // comma must be escaped
      rawInputText: 'he said "2 parathas"', // quotes must be escaped
      quantity: 2, unit: "piece", caloriesKcal: 600, proteinG: 12, carbsG: 72, fatG: 30,
      estimatedCostPkr: 120,
    },
  });
  await prisma.waterEntry.create({ data: { dailyLogId: log.id, amountMl: 1500 } });
  await prisma.weightEntry.create({
    data: { userId: user.id, logDate: new Date(Date.UTC(2026, 6, 22)), weightKg: 68 },
  });
  await prisma.aiFeedback.create({
    data: { dailyLogId: log.id, feedbackText: "You're 74g short on protein.", userRating: 1 },
  });
  await prisma.hostelMessItem.create({
    data: { userId: user.id, mealType: "DINNER", description: "Daal chawal" },
  });
  await prisma.reminderSettings.create({ data: { userId: user.id } });

  const csv = await buildExportCsv(user.id);
  console.log("\nexport size:", csv.length, "chars");

  for (const section of [
    "## Profile", "## Daily totals", "## Meal entries", "## Water entries",
    "## Weight entries", "## AI guidance history", "## Saved mess menu",
  ]) {
    ok(csv.includes(section), `export must include section ${section}`);
  }
  ok(csv.includes("privacy-check@example.invalid"), "export includes the account email");
  ok(csv.includes("1110"), "export includes daily totals");
  ok(csv.includes("74g short on protein"), "export includes guidance history");
  ok(csv.includes("68"), "export includes weight history");

  // CSV injection/escaping: a value containing a comma must be quoted.
  ok(
    csv.includes('"paratha, with butter"'),
    "a value containing a comma must be quoted in the CSV",
  );
  ok(
    csv.includes('"he said ""2 parathas"""'),
    "embedded double quotes must be doubled per RFC 4180",
  );

  // ---------- deletion cascade ----------
  await prisma.user.delete({ where: { id: user.id } });

  const remaining = {
    profiles: await prisma.profile.count({ where: { userId: user.id } }),
    dailyLogs: await prisma.dailyLog.count({ where: { userId: user.id } }),
    mealEntries: await prisma.mealEntry.count({ where: { dailyLogId: log.id } }),
    waterEntries: await prisma.waterEntry.count({ where: { dailyLogId: log.id } }),
    aiFeedback: await prisma.aiFeedback.count({ where: { dailyLogId: log.id } }),
    weights: await prisma.weightEntry.count({ where: { userId: user.id } }),
    messItems: await prisma.hostelMessItem.count({ where: { userId: user.id } }),
    reminders: await prisma.reminderSettings.count({ where: { userId: user.id } }),
    dataRequests: await prisma.dataRequest.count({ where: { userId: user.id } }),
  };
  console.log("rows remaining after delete:", remaining);

  for (const [table, count] of Object.entries(remaining)) {
    ok(count === 0, `deletion must leave no ${table} behind (found ${count})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll privacy checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
