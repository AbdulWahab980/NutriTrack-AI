/**
 * Turns totals vs targets into specific, numeric gap statements.
 *
 * Deliberately free of verdicts: no "healthy"/"unhealthy", no moralising, no
 * good/bad food framing (spec §3.4, §3.8). Every line names a number.
 */

export type Totals = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
};

export type Targets = {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetWaterMl: number;
};

export type Gap = {
  label: string;
  /** Positive = still short of target; negative = over target. */
  remaining: number;
  unit: string;
  text: string;
};

/** Only flag a gap once the day has some data — an empty day isn't a shortfall. */
export function computeGaps(totals: Totals, targets: Targets): Gap[] {
  const gaps: Gap[] = [];

  const protein = targets.targetProteinG - totals.proteinG;
  if (protein > 5) {
    gaps.push({
      label: "Protein",
      remaining: Math.round(protein),
      unit: "g",
      text: `You're ${Math.round(protein)}g short on protein today.`,
    });
  }

  const water = targets.targetWaterMl - totals.waterMl;
  if (water > 100) {
    gaps.push({
      label: "Water",
      remaining: Math.round(water),
      unit: "ml",
      text: `You're ${Math.round(water)}ml short of your water target.`,
    });
  }

  const calories = targets.targetCalories - totals.caloriesKcal;
  if (calories > 100) {
    gaps.push({
      label: "Calories",
      remaining: Math.round(calories),
      unit: "kcal",
      text: `You have ${Math.round(calories)} kcal left against today's target.`,
    });
  } else if (calories < -100) {
    gaps.push({
      label: "Calories",
      remaining: Math.round(calories),
      unit: "kcal",
      text: `You're ${Math.round(-calories)} kcal above today's target.`,
    });
  }

  return gaps;
}

export function percentOf(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}
