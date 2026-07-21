/**
 * Sanity checks for the target calculator (src/lib/targets.ts).
 * Run with: npm run check:targets
 *
 * These are assertions over hand-computed values — no DB or network needed.
 * Replace with a proper test runner when the suite grows.
 */
import { calculateBmr, calculateTargets } from "../src/lib/targets";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

// Spec's example persona: 21yo male hostel student, 175cm, 68kg, moderate, muscle gain.
const persona = {
  age: 21,
  gender: "MALE",
  heightCm: 175,
  weightKg: 68,
  activityLevel: "MODERATE",
  goal: "MUSCLE_GAIN",
} as const;

const t = calculateTargets(persona);
console.log("persona targets:", t);

// Mifflin-St Jeor by hand: 10*68 + 6.25*175 - 5*21 + 5 = 1673.75
ok(Math.abs(calculateBmr(persona) - 1673.75) < 0.01, "BMR should equal 1673.75");
ok(Math.abs(t.tdeeKcal - 1673.75 * 1.55) < 0.2, "TDEE should be BMR * 1.55");
ok(Math.abs(t.targetCalories - (t.tdeeKcal + 300)) < 0.2, "muscle gain adds 300 kcal");
ok(Math.abs(t.targetProteinG - 68 * 1.8) < 0.2, "protein = 1.8 g/kg for muscle gain");
ok(t.targetWaterMl === 2400, "water = 68*35 = 2380, rounded to nearest 50 => 2400");

// Macro calories must reconcile with the calorie target.
const macroKcal = t.targetProteinG * 4 + t.targetCarbsG * 4 + t.targetFatG * 9;
ok(
  Math.abs(macroKcal - t.targetCalories) < 5,
  `macros should sum to the calorie target (got ${macroKcal.toFixed(1)} vs ${t.targetCalories})`,
);

// Safety floor: a small sedentary person on weight loss must not be starved.
const small = calculateTargets({
  age: 30,
  gender: "FEMALE",
  heightCm: 150,
  weightKg: 45,
  activityLevel: "SEDENTARY",
  goal: "WEIGHT_LOSS",
});
console.log("small/weight-loss targets:", small);
ok(small.targetCalories >= 1200, "never prescribe below the 1200 kcal floor");
ok(small.targetCalories >= small.bmrKcal, "never prescribe below BMR");

// Gender handling: OTHER should sit between MALE and FEMALE, not default to one.
const base = {
  age: 25,
  heightCm: 170,
  weightKg: 65,
  activityLevel: "LIGHT",
  goal: "MAINTENANCE",
} as const;
const m = calculateBmr({ ...base, gender: "MALE" });
const f = calculateBmr({ ...base, gender: "FEMALE" });
const o = calculateBmr({ ...base, gender: "OTHER" });
ok(o < m && o > f, "OTHER BMR should fall between MALE and FEMALE");

if (fails.length) {
  console.error("\nFAILED:");
  for (const msg of fails) console.error("  x " + msg);
  process.exit(1);
}
console.log("\nAll target checks passed.");
