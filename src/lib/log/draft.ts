import { extractMealLog } from "@/lib/llm/extract";
import { lookupNutrition } from "@/lib/nutrition/service";

/**
 * Turns a free-text message into a reviewable draft: extraction (stage 1)
 * followed by a nutrition lookup for every item.
 *
 * Nothing is persisted here — the user confirms first (spec §3.2).
 */

export type DraftItem = {
  /** What the user called it, kept for the audit trail. */
  rawName: string;
  /** What the nutrition source calls it. */
  name: string;
  quantity: number;
  unit: string;
  confidence: "high" | "medium" | "low";
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  matched: boolean;
  foodItemId: string | null;
  /// Reference cost for this amount; null when unknown.
  approxCostPkr: number | null;
};

export type DraftMeal = {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  items: DraftItem[];
};

export type LogDraft = {
  meals: DraftMeal[];
  waterMl: number;
  clarifications: string[];
  totals: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  /** Sum of known item costs; excludes items with no reference price. */
  estimatedCostPkr: number;
  /** Items we could not price nutritionally — surfaced, never silently zeroed. */
  unmatchedNames: string[];
};

const round = (v: number) => Math.round(v * 10) / 10;

export async function buildDraft(message: string): Promise<LogDraft> {
  const extracted = await extractMealLog(message);

  const meals: DraftMeal[] = await Promise.all(
    extracted.meals.map(async (meal) => ({
      mealType: meal.meal_type,
      items: await Promise.all(
        meal.items.map(async (item): Promise<DraftItem> => {
          const n = await lookupNutrition(item.name, item.quantity, item.unit);
          return {
            rawName: item.name,
            name: n.matched ? n.name : item.name,
            quantity: item.quantity,
            unit: item.unit,
            confidence: item.confidence,
            caloriesKcal: round(n.caloriesKcal),
            proteinG: round(n.proteinG),
            carbsG: round(n.carbsG),
            fatG: round(n.fatG),
            matched: n.matched,
            foodItemId: n.foodItemId,
            approxCostPkr: n.approxCostPkr === null ? null : round(n.approxCostPkr),
          };
        }),
      ),
    })),
  );

  const allItems = meals.flatMap((m) => m.items);
  // Unmatched items contribute nothing rather than a fabricated estimate.
  const totals = allItems.reduce(
    (acc, i) => ({
      caloriesKcal: acc.caloriesKcal + i.caloriesKcal,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return {
    meals,
    waterMl: extracted.water_intake_ml,
    clarifications: extracted.clarification_needed,
    totals: {
      caloriesKcal: round(totals.caloriesKcal),
      proteinG: round(totals.proteinG),
      carbsG: round(totals.carbsG),
      fatG: round(totals.fatG),
    },
    estimatedCostPkr: round(
      allItems.reduce((sum, i) => sum + (i.approxCostPkr ?? 0), 0),
    ),
    unmatchedNames: allItems.filter((i) => !i.matched).map((i) => i.rawName),
  };
}
