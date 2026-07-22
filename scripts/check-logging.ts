/**
 * End-to-end check of the Phase 2 logging pipeline against real OpenAI +
 * the real database: free text -> extraction -> nutrition -> saved totals.
 *
 * Creates and deletes its own test user. Run with: npm run check:logging
 */
import "dotenv/config";
import { buildDraft } from "../src/lib/log/draft";
import { saveDraft, parseLocalDate } from "../src/lib/log/persist";
import { prisma } from "../src/lib/prisma";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const TEST_UID = "00000000-0000-4000-8000-00000000beef";

async function main() {
  await prisma.user.deleteMany({ where: { supabaseUserId: TEST_UID } });
  const user = await prisma.user.create({
    data: { supabaseUserId: TEST_UID, email: "phase2-check@example.invalid" },
  });

  const message =
    "I had 2 parathas and a cup of tea for breakfast, daal chawal for lunch, " +
    "and I've drank about 1.5 liters of water so far.";

  const draft = await buildDraft(message);
  console.log("draft totals:", draft.totals, "| water:", draft.waterMl, "ml");
  for (const meal of draft.meals) {
    for (const i of meal.items) {
      console.log(
        `  ${meal.mealType}: ${i.quantity} ${i.unit} ${i.name} -> ` +
          `${i.caloriesKcal} kcal (${i.matched ? "matched" : "UNMATCHED"})`,
      );
    }
  }

  ok(draft.waterMl === 1500, `water should be 1500ml, got ${draft.waterMl}`);
  ok(draft.totals.caloriesKcal > 800, "a full day's meals should total > 800 kcal");
  ok(
    draft.meals.flatMap((m) => m.items).every((i) => i.matched),
    `all example foods should match locally; unmatched: ${draft.unmatchedNames.join(", ")}`,
  );

  // Persist and verify the stored totals agree with the draft.
  const log = await saveDraft(user.id, draft, parseLocalDate("2026-07-22"), message);
  console.log("saved totals:", {
    kcal: log.totalCalories,
    protein: log.totalProteinG,
    water: log.totalWaterMl,
  });

  ok(
    Math.abs(log.totalCalories - draft.totals.caloriesKcal) < 1,
    `saved calories (${log.totalCalories}) should match draft (${draft.totals.caloriesKcal})`,
  );
  ok(log.totalWaterMl === 1500, "saved water should be 1500ml");

  const entries = await prisma.mealEntry.findMany({ where: { dailyLogId: log.id } });
  ok(entries.length === 3, `should store 3 meal entries, got ${entries.length}`);
  ok(
    entries.every((e) => e.rawInputText === message),
    "each entry keeps the original message for auditing",
  );
  ok(
    entries.some((e) => e.mealType === "BREAKFAST") &&
      entries.some((e) => e.mealType === "LUNCH"),
    "meal types should be mapped to enum values",
  );

  // Logging again the same day must accumulate into the same daily log.
  const second = await buildDraft("a banana as a snack");
  const log2 = await saveDraft(user.id, second, parseLocalDate("2026-07-22"), "a banana");
  ok(log2.id === log.id, "same-day logging should reuse the same daily log row");
  ok(
    log2.totalCalories > log.totalCalories,
    `totals should accumulate (${log.totalCalories} -> ${log2.totalCalories})`,
  );
  console.log("after second log:", log2.totalCalories, "kcal");

  const dayCount = await prisma.dailyLog.count({ where: { userId: user.id } });
  ok(dayCount === 1, `should have exactly 1 daily log, got ${dayCount}`);

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
    console.log("\nAll logging checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
