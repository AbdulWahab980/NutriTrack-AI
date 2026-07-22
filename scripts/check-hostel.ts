/**
 * Checks hostel mode (spec §3.5): candidate shortlisting under budget /
 * kitchen / dietary constraints, grounded suggestions, and budget tracking.
 * Run with: npm run check:hostel   (uses OpenAI for the suggestion step)
 */
import "dotenv/config";
import {
  getAffordableProteinOptions,
  generateHostelSuggestions,
} from "../src/lib/hostel/suggest";
import { getWeeklyBudget } from "../src/lib/hostel/budget";
import { prisma } from "../src/lib/prisma";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const COOKED = ["karahi", "biryani", "nihari", "haleem", "keema", "curry", "omelette", "pulao"];
const MEAT = ["chicken", "beef", "mutton", "keema", "gosht", "nihari", "fish", "tikka"];

async function main() {
  // --- 1. no kitchen access -> only no-cook items ---
  const noCook = await getAffordableProteinOptions(500, "NONE", []);
  console.log("no-cook options:", noCook.map((c) => `${c.name} (${c.proteinG}g / ${c.costPkr} PKR)`));
  ok(noCook.length > 0, "should still find options with no kitchen");
  ok(
    !noCook.some((c) => COOKED.some((k) => c.name.toLowerCase().includes(k))),
    `no-cook list must not contain cooked dishes: ${noCook.map((c) => c.name).join(", ")}`,
  );

  // --- 2. vegetarian -> no meat ---
  const veg = await getAffordableProteinOptions(500, "INDUCTION", ["vegetarian"]);
  console.log("vegetarian options:", veg.map((c) => c.name));
  ok(
    !veg.some((c) => MEAT.some((m) => c.name.toLowerCase().includes(m))),
    `vegetarian list must not contain meat: ${veg.map((c) => c.name).join(", ")}`,
  );

  // --- 3. tight budget -> per-item cap (half the daily budget) ---
  const tight = await getAffordableProteinOptions(100, "INDUCTION", []);
  console.log("tight-budget options:", tight.map((c) => `${c.name} @ ${c.costPkr}`));
  ok(
    tight.every((c) => c.costPkr <= 50),
    `on a 100 PKR budget no single item should exceed 50 PKR: ${tight.map((c) => `${c.name}:${c.costPkr}`).join(", ")}`,
  );

  // --- 4. ranked by protein per rupee ---
  const ranked = await getAffordableProteinOptions(1000, "INDUCTION", []);
  const ratios = ranked.map((c) => c.proteinG / c.costPkr);
  ok(
    ratios.every((v, i) => i === 0 || ratios[i - 1] >= v),
    "candidates should be ranked by protein per PKR",
  );
  console.log(
    "top protein-per-rupee:",
    ranked.slice(0, 3).map((c) => `${c.name} (${(c.proteinG / c.costPkr).toFixed(3)} g/PKR)`),
  );

  // --- 5. lactose intolerant -> no dairy ---
  const lactose = await getAffordableProteinOptions(500, "INDUCTION", ["lactose_intolerant"]);
  ok(
    !lactose.some((c) => ["milk", "yogurt", "dahi", "paneer", "lassi"].some((d) => c.name.toLowerCase().includes(d))),
    `lactose-intolerant list must not contain dairy: ${lactose.map((c) => c.name).join(", ")}`,
  );

  // --- 6. safety screen short-circuits (no API call) ---
  const realKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const suppressed = await generateHostelSuggestions({
    budgetPkr: 500, spentTodayPkr: 0, kitchenAccess: "KETTLE",
    dietaryRestrictions: [], messDescription: "I've been starving myself to save money",
    gaps: [],
  });
  ok(suppressed.kind === "support", "distressing mess note must return support");
  console.log("guardrail in hostel mode: suppressed with no API call");
  process.env.OPENAI_API_KEY = realKey;

  // --- 7. real suggestion, grounded in candidates ---
  const result = await generateHostelSuggestions({
    budgetPkr: 500,
    spentTodayPkr: 150,
    kitchenAccess: "NONE",
    dietaryRestrictions: ["vegetarian"],
    messDescription: "daal and roti tonight",
    gaps: [{ label: "Protein", remaining: 74, unit: "g", text: "You're 74g short on protein today." }],
  });
  ok(result.kind === "suggestion", "should produce a suggestion");
  if (result.kind === "suggestion") {
    console.log("\n--- hostel suggestion ---\n" + result.text + "\n-------------------------");
    const lower = result.text.toLowerCase();
    ok(/\d/.test(result.text), "suggestion must cite numbers");
    ok(/pkr|rs\.?\s*\d/i.test(result.text), "suggestion should quote cost in PKR");
    // Constraints must hold in the prose, not just the shortlist.
    for (const m of MEAT) {
      ok(!lower.includes(m), `vegetarian suggestion must not mention ${m}`);
    }
    for (const c of COOKED) {
      ok(!lower.includes(c), `no-kitchen suggestion must not require cooking (${c})`);
    }
    for (const bad of ["unhealthy", "cheat meal", "guilty", "bad food"]) {
      ok(!lower.includes(bad), `suggestion must not moralise: ${bad}`);
    }
  }

  // --- 8. budget tracker maths ---
  const TEST_UID = "00000000-0000-4000-8000-0000000cafe1";
  await prisma.user.deleteMany({ where: { supabaseUserId: TEST_UID } });
  const user = await prisma.user.create({
    data: { supabaseUserId: TEST_UID, email: "hostel-check@example.invalid" },
  });
  const today = new Date(Date.UTC(2026, 6, 22));
  const log = await prisma.dailyLog.create({
    data: { userId: user.id, logDate: today },
  });
  await prisma.mealEntry.createMany({
    data: [
      { dailyLogId: log.id, mealType: "LUNCH", foodName: "daal chawal", rawInputText: "x",
        quantity: 1, unit: "plate", caloriesKcal: 420, proteinG: 14, carbsG: 76, fatG: 6,
        estimatedCostPkr: 150 },
      { dailyLogId: log.id, mealType: "SNACK", foodName: "banana", rawInputText: "x",
        quantity: 1, unit: "piece", caloriesKcal: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4,
        estimatedCostPkr: 30 },
      // No known price — must not be counted or guessed.
      { dailyLogId: log.id, mealType: "DINNER", foodName: "mystery", rawInputText: "x",
        quantity: 1, unit: "plate", caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0,
        estimatedCostPkr: null, needsManualEntry: true },
    ],
  });

  const budget = await getWeeklyBudget(user.id, today, 500);
  console.log("\nweekly budget:", {
    total: budget.totalPkr, weekly: budget.weeklyBudgetPkr,
    unpriced: budget.unpricedItems, daysLogged: budget.daysLogged,
  });
  ok(budget.totalPkr === 180, `spend should be 150+30=180, got ${budget.totalPkr}`);
  ok(budget.unpricedItems === 1, "unpriced item should be counted separately, not summed");
  ok(budget.weeklyBudgetPkr === 3500, "weekly budget = 500 * 7");
  ok(budget.days.length === 7, "should return exactly 7 days");
  ok(budget.daysLogged === 1, "only one day has activity");

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
    console.log("\nAll hostel checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
