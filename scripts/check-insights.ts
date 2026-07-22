/**
 * Checks gap statements are numeric, specific, and verdict-free (spec §3.3/§3.4).
 * Run with: npm run check:insights
 */
import { computeGaps, percentOf } from "../src/lib/insights";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const targets = {
  targetCalories: 2400,
  targetProteinG: 130,
  targetCarbsG: 280,
  targetFatG: 70,
  targetWaterMl: 2500,
};

// Under target on everything.
const short = computeGaps(
  { caloriesKcal: 1450, proteinG: 90, carbsG: 190, fatG: 40, waterMl: 1500 },
  targets,
);
console.log(short.map((g) => g.text));
ok(short.some((g) => g.text === "You're 40g short on protein today."),
  "protein gap should read exactly as the spec example");
ok(short.some((g) => g.label === "Water" && g.remaining === 1000), "water gap = 1000ml");
ok(short.some((g) => g.label === "Calories" && g.remaining === 950), "calorie gap = 950");

// Over the calorie target.
const over = computeGaps(
  { caloriesKcal: 2900, proteinG: 140, carbsG: 300, fatG: 90, waterMl: 2600 },
  targets,
);
console.log(over.map((g) => g.text));
ok(over.length === 1 && over[0].label === "Calories", "only the calorie gap should flag");
ok(over[0].text.includes("500 kcal above"), "should state how far above target");

// On target -> nothing to flag.
const onTarget = computeGaps(
  { caloriesKcal: 2400, proteinG: 130, carbsG: 280, fatG: 70, waterMl: 2500 },
  targets,
);
ok(onTarget.length === 0, "hitting targets should produce no gap statements");

// No verdicts or moralising anywhere (spec §3.4, §3.8).
const banned = ["healthy", "unhealthy", "bad", "good", "cheat", "guilty", "should"];
const allText = [...short, ...over].map((g) => g.text.toLowerCase()).join(" ");
for (const word of banned) {
  ok(!allText.includes(word), `gap text must not contain the word "${word}"`);
}
// Every statement names a number.
ok([...short, ...over].every((g) => /\d/.test(g.text)), "every gap must be numeric");

ok(percentOf(50, 100) === 50, "percentOf basic");
ok(percentOf(150, 100) === 100, "percentOf caps at 100");
ok(percentOf(5, 0) === 0, "percentOf handles zero target");

if (fails.length) {
  console.error("\nFAILED:");
  for (const f of fails) console.error("  x " + f);
  process.exit(1);
}
console.log("\nAll insight checks passed.");
