/**
 * Live check of stage-2 advice generation (spec §7) and the safety guardrail.
 * Run with: npm run check:advice   (costs a few tokens)
 */
import "dotenv/config";
import { generateAdvice, type AdviceProfile } from "../src/lib/llm/advice";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const hostelStudent: AdviceProfile = {
  age: 21,
  gender: "MALE",
  heightCm: 175,
  weightKg: 68,
  activityLevel: "MODERATE",
  goal: "MUSCLE_GAIN",
  livingSituation: "HOSTEL",
  dailyFoodBudgetPkr: 500,
  kitchenAccess: "KETTLE",
  hasMessPlan: true,
  messNotes: "roti and daal most nights, chicken twice a week",
  dietaryRestrictions: [],
};

const totals = { caloriesKcal: 1450, proteinG: 48, carbsG: 190, fatG: 40, waterMl: 1500 };
const targets = {
  targetCalories: 2894,
  targetProteinG: 122,
  targetCarbsG: 420,
  targetFatG: 80,
  targetWaterMl: 2400,
};

async function main() {
  // --- 1. Guardrail must short-circuit BEFORE any API call. ---
  // Blanking the key first: if the screen did not stop execution, the lazy
  // OpenAI client would throw on the missing key instead of returning support.
  const realKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const suppressed = await generateAdvice(hostelStudent, totals, targets, [
    "I've been starving myself all week to lose weight",
  ]);
  ok(suppressed.kind === "support", "distressing input must return support, not advice");
  if (suppressed.kind === "support") {
    ok(
      suppressed.categories.includes("extreme_restriction"),
      `should report the category, got ${suppressed.categories.join(",")}`,
    );
    console.log("guardrail: suppressed advice with no API call ->", suppressed.categories);
  }

  process.env.OPENAI_API_KEY = realKey;

  // --- 2. Normal advice generation ---
  const result = await generateAdvice(hostelStudent, totals, targets, [
    "2 parathas and chai for breakfast, daal chawal for lunch",
  ]);
  ok(result.kind === "advice", "normal input should produce advice");
  if (result.kind !== "advice") throw new Error("no advice to inspect");

  const text = result.text;
  console.log("\n--- generated advice ---\n" + text + "\n------------------------");

  ok(/\d/.test(text), "advice must cite real numbers");
  ok(text.length > 80, "advice should be substantive");

  const lower = text.toLowerCase();

  // No health verdicts (spec §3.4).
  for (const verdict of ["you are healthy", "you're healthy", "unhealthy", "you are unhealthy"]) {
    ok(!lower.includes(verdict), `advice must not contain a health verdict: "${verdict}"`);
  }
  // No moralising language (spec §7).
  for (const word of ["cheat meal", "guilty", "bad food", "junk food", "should feel"]) {
    ok(!lower.includes(word), `advice must not moralise: "${word}"`);
  }

  // Hostel mode: must be budget-aware.
  ok(
    /pkr|rs\.?\s*\d|rupee/i.test(text),
    "hostel-mode advice should mention approximate cost in PKR",
  );
  // Should engage with the actual gap (protein is 74g short).
  ok(/protein/i.test(text), "advice should address the protein gap");

  // --- 3. Dietary restrictions must be respected ---
  const vegetarian: AdviceProfile = {
    ...hostelStudent,
    dietaryRestrictions: ["vegetarian"],
  };
  const vegResult = await generateAdvice(vegetarian, totals, targets, ["daal chawal for lunch"]);
  if (vegResult.kind === "advice") {
    console.log("\n--- vegetarian advice ---\n" + vegResult.text + "\n-------------------------");
    const vl = vegResult.text.toLowerCase();
    for (const meat of ["chicken", "beef", "mutton", "fish", "shawarma"]) {
      ok(!vl.includes(meat), `vegetarian advice must not suggest ${meat}`);
    }
  }
}

main()
  .then(() => {
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll advice checks passed.");
  })
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  });
