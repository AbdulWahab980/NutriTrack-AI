/**
 * Checks the nutrition lookup chain against the seeded local dataset.
 * Run with: npm run check:nutrition   (no external API keys needed)
 */
import "dotenv/config";
import { lookupNutrition, servingFactor } from "../src/lib/nutrition/service";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};
const near = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

async function main() {
  // --- unit-aware scaling (pure) ---
  ok(servingFactor(2, "piece", 1, "piece") === 2, "2 pieces of a 1-piece item = 2x");
  ok(servingFactor(1, "glass", 250, "ml") === 1, "1 glass vs 250ml default = 1 serving");
  ok(servingFactor(500, "ml", 250, "ml") === 2, "500ml vs 250ml default = 2x");
  ok(servingFactor(1, "l", 250, "ml") === 4, "1 litre vs 250ml default = 4x");
  ok(servingFactor(2, "pieces", 1, "piece") === 2, "plural units normalise");
  ok(servingFactor(200, "g", 100, "g") === 2, "200g vs 100g default = 2x");

  // --- real lookups ---
  const paratha = await lookupNutrition("paratha", 2, "piece");
  console.log("2 paratha ->", paratha.caloriesKcal, "kcal, source", paratha.source);
  ok(paratha.matched, "paratha should match locally");
  ok(near(paratha.caloriesKcal, 600), `2 parathas should be ~600 kcal, got ${paratha.caloriesKcal}`);

  const milkGlass = await lookupNutrition("milk", 1, "glass");
  console.log("1 glass milk ->", milkGlass.caloriesKcal, "kcal");
  ok(
    near(milkGlass.caloriesKcal, 150),
    `1 glass of milk should be ~150 kcal, got ${milkGlass.caloriesKcal}`,
  );

  const milkMl = await lookupNutrition("milk", 500, "ml");
  ok(near(milkMl.caloriesKcal, 300), `500ml milk should be ~300 kcal, got ${milkMl.caloriesKcal}`);

  // Alias resolution
  const chai = await lookupNutrition("chai", 1, "cup");
  console.log("1 chai ->", chai.caloriesKcal, "kcal");
  ok(chai.matched && near(chai.caloriesKcal, 90), "chai should resolve via alias to tea with milk");

  // Longest-match wins: "daal chawal" must not resolve to plain "daal".
  const daalChawal = await lookupNutrition("daal chawal", 1, "plate");
  console.log("daal chawal ->", daalChawal.caloriesKcal, "kcal (name:", daalChawal.name + ")");
  ok(
    near(daalChawal.caloriesKcal, 420),
    `daal chawal should be ~420 kcal, not plain daal; got ${daalChawal.caloriesKcal}`,
  );

  // Unmatched food must never produce a guessed number.
  const unknown = await lookupNutrition("zzz not a real food zzz", 1, "bowl");
  console.log("unknown ->", unknown);
  ok(!unknown.matched, "unknown food should be unmatched");
  ok(unknown.caloriesKcal === 0, "unmatched food must report 0, never a guess");
  ok(unknown.source === null, "unmatched food should have no source");
}

main()
  .then(() => {
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll nutrition checks passed.");
  })
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  });
