import type {
  ActivityLevel,
  Gender,
  Goal,
} from "@/generated/prisma/enums";

/**
 * Derives a user's daily nutrition targets from their profile.
 *
 * Everything here is a pure function so it can be unit-checked without a
 * database. Targets are recomputed (never hand-edited) whenever the profile
 * changes — see spec §3.1.
 */

export type TargetInputs = {
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
};

export type Targets = {
  bmrKcal: number;
  tdeeKcal: number;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetWaterMl: number;
};

/** Mifflin-St Jeor constant offset, by gender. */
const GENDER_OFFSET: Record<Gender, number> = {
  MALE: 5,
  FEMALE: -161,
  // No separate validated equation exists; use the midpoint of the two so the
  // estimate is not silently biased toward either.
  OTHER: -78,
  PREFER_NOT_TO_SAY: -78,
};

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/** Calorie adjustment applied to TDEE, by goal. */
const GOAL_CALORIE_DELTA: Record<Goal, number> = {
  WEIGHT_LOSS: -500,
  MUSCLE_GAIN: 300,
  MAINTENANCE: 0,
  GENERAL_HEALTH: 0,
};

/** Protein target in grams per kg of body weight, by goal. */
const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  WEIGHT_LOSS: 1.6, // preserve lean mass in a deficit
  MUSCLE_GAIN: 1.8,
  MAINTENANCE: 1.2,
  GENERAL_HEALTH: 1.2,
};

/** Share of total calories from fat. Remainder goes to carbs. */
const FAT_CALORIE_SHARE = 0.25;

/** Absolute lower bound on a calorie target, regardless of goal (safety). */
const ABSOLUTE_CALORIE_FLOOR = 1200;

/** Spec §3.1: daily water target is 35ml per kg of body weight. */
const WATER_ML_PER_KG = 35;

/** Mifflin-St Jeor basal metabolic rate, in kcal/day. */
export function calculateBmr({
  age,
  gender,
  heightCm,
  weightKg,
}: Pick<TargetInputs, "age" | "gender" | "heightCm" | "weightKg">): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + GENDER_OFFSET[gender];
}

/** Total daily energy expenditure = BMR scaled by activity level. */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIER[activityLevel];
}

/**
 * Daily water target in ml, rounded to the nearest 50ml so the number reads
 * as a target rather than false precision. Adjustable by the user later.
 */
export function calculateWaterTargetMl(weightKg: number): number {
  return Math.round((weightKg * WATER_ML_PER_KG) / 50) * 50;
}

export function calculateTargets(input: TargetInputs): Targets {
  const bmrKcal = calculateBmr(input);
  const tdeeKcal = calculateTdee(bmrKcal, input.activityLevel);

  // Never prescribe a deficit that drops below BMR or the absolute floor —
  // aggressive restriction is out of scope for this product (spec §3.8).
  const floor = Math.max(ABSOLUTE_CALORIE_FLOOR, bmrKcal);
  const targetCalories = Math.max(floor, tdeeKcal + GOAL_CALORIE_DELTA[input.goal]);

  const targetProteinG = input.weightKg * GOAL_PROTEIN_PER_KG[input.goal];
  const targetFatG = (targetCalories * FAT_CALORIE_SHARE) / 9;
  // Carbs take whatever calories remain after protein (4 kcal/g) and fat (9 kcal/g).
  const targetCarbsG = Math.max(
    0,
    (targetCalories - targetProteinG * 4 - targetFatG * 9) / 4,
  );

  return {
    bmrKcal: round(bmrKcal),
    tdeeKcal: round(tdeeKcal),
    targetCalories: round(targetCalories),
    targetProteinG: round(targetProteinG),
    targetCarbsG: round(targetCarbsG),
    targetFatG: round(targetFatG),
    targetWaterMl: calculateWaterTargetMl(input.weightKg),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
