import { prisma } from "@/lib/prisma";
import type { FoodSource } from "@/generated/prisma/enums";

/**
 * Nutrition lookups (ported from reference/nutrition_service.py).
 *
 * Lookup order — the LLM never supplies these numbers:
 *   1. Local food_items table (custom desi dataset + previously cached lookups)
 *   2. Nutritionix   (primary external, natural-language parsing)
 *   3. USDA          (fallback, better for raw/generic ingredients)
 *   4. Give up -> matched:false. NEVER a guessed number.
 *
 * External tiers are skipped automatically when their API keys are absent, so
 * the app works fully offline against the local dataset.
 */

export type NutritionResult = {
  name: string;
  quantity: number;
  unit: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  source: FoodSource | null;
  foodItemId: string | null;
  matched: boolean;
};

const NUTRITIONIX_NL_ENDPOINT = "https://trackapi.nutritionix.com/v2/natural/nutrients";
const USDA_SEARCH_ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";
const EXTERNAL_TIMEOUT_MS = 5000;

export function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function unmatched(name: string, quantity: number, unit: string): NutritionResult {
  return {
    name,
    quantity,
    unit,
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: null,
    source: null,
    foodItemId: null,
    matched: false,
  };
}

/** Main entrypoint — call once per extracted food item. */
export async function lookupNutrition(
  foodName: string,
  quantity: number,
  unit: string,
): Promise<NutritionResult> {
  const local = await lookupLocal(foodName, quantity, unit);
  if (local) return local;

  const nutritionix = await queryNutritionix(foodName, quantity, unit);
  if (nutritionix) return cacheAndReturn(nutritionix);

  const usda = await queryUsda(foodName, quantity, unit);
  if (usda) return cacheAndReturn(usda);

  // Nothing matched. Flag for manual entry rather than inventing a number.
  console.warn(`[nutrition] no match for "${foodName}"`);
  return unmatched(foodName, quantity, unit);
}

// ---------- tier 1: local ----------

async function lookupLocal(
  foodName: string,
  quantity: number,
  unit: string,
): Promise<NutritionResult | null> {
  const normalized = normalize(foodName);

  // Exact match first, then a contains-match so "chicken biryani plate"
  // still resolves to "chicken biryani".
  const row =
    (await prisma.foodItem.findFirst({ where: { normalizedName: normalized } })) ??
    (await prisma.foodItem.findFirst({
      where: { normalizedName: { contains: normalized } },
      orderBy: { normalizedName: "asc" },
    })) ??
    (await findByWordOverlap(normalized));

  if (!row) return null;

  return scale(
    {
      name: row.name,
      defaultQuantity: row.defaultQuantity,
      defaultUnit: row.defaultUnit,
      caloriesKcal: row.caloriesKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fiberG: row.fiberG,
      source: row.source,
      foodItemId: row.id,
    },
    quantity,
    unit,
  );
}

/** Last-resort local match: the stored name is contained in the user's phrase. */
async function findByWordOverlap(normalized: string) {
  const candidates = await prisma.foodItem.findMany({
    select: { id: true, name: true, normalizedName: true, defaultQuantity: true,
      caloriesKcal: true, proteinG: true, carbsG: true, fatG: true, fiberG: true,
      source: true, defaultUnit: true },
  });
  // Prefer the longest stored name that appears in the phrase — "daal chawal"
  // should win over "daal" for the phrase "daal chawal".
  return (
    candidates
      .filter((c) => normalized.includes(c.normalizedName))
      .sort((a, b) => b.normalizedName.length - a.normalizedName.length)[0] ?? null
  );
}

// ---------- tier 2: Nutritionix ----------

async function queryNutritionix(
  foodName: string,
  quantity: number,
  unit: string,
): Promise<NutritionResult | null> {
  const appId = process.env.NUTRITIONIX_APP_ID;
  const apiKey = process.env.NUTRITIONIX_API_KEY;
  if (!appId || !apiKey) return null; // tier not configured

  try {
    const resp = await fetch(NUTRITIONIX_NL_ENDPOINT, {
      method: "POST",
      headers: {
        "x-app-id": appId,
        "x-app-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: `${quantity} ${unit} ${foodName}` }),
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });
    if (!resp.ok) {
      console.warn(`[nutrition] Nutritionix ${resp.status} for "${foodName}"`);
      return null;
    }
    const food = (await resp.json())?.foods?.[0];
    if (!food) return null;

    return {
      name: food.food_name ?? foodName,
      quantity,
      unit,
      caloriesKcal: food.nf_calories ?? 0,
      proteinG: food.nf_protein ?? 0,
      carbsG: food.nf_total_carbohydrate ?? 0,
      fatG: food.nf_total_fat ?? 0,
      fiberG: food.nf_dietary_fiber ?? null,
      source: "NUTRITIONIX",
      foodItemId: null,
      matched: true,
    };
  } catch (e) {
    console.error("[nutrition] Nutritionix request failed:", (e as Error).message);
    return null;
  }
}

// ---------- tier 3: USDA ----------

async function queryUsda(
  foodName: string,
  quantity: number,
  unit: string,
): Promise<NutritionResult | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return null; // tier not configured

  try {
    const url = `${USDA_SEARCH_ENDPOINT}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(foodName)}&pageSize=1`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS) });
    if (!resp.ok) {
      console.warn(`[nutrition] USDA ${resp.status} for "${foodName}"`);
      return null;
    }
    const food = (await resp.json())?.foods?.[0];
    if (!food) return null;

    const n: Record<string, number> = {};
    for (const nutrient of food.foodNutrients ?? []) {
      n[nutrient.nutrientName] = nutrient.value;
    }

    return {
      name: food.description ?? foodName,
      quantity,
      unit,
      caloriesKcal: n["Energy"] ?? 0,
      proteinG: n["Protein"] ?? 0,
      carbsG: n["Carbohydrate, by difference"] ?? 0,
      fatG: n["Total lipid (fat)"] ?? 0,
      fiberG: n["Fiber, total dietary"] ?? null,
      source: "USDA",
      foodItemId: null,
      matched: true,
    };
  } catch (e) {
    console.error("[nutrition] USDA request failed:", (e as Error).message);
    return null;
  }
}

// ---------- helpers ----------

/** Persists external hits so the local dataset grows over time. */
async function cacheAndReturn(result: NutritionResult): Promise<NutritionResult> {
  try {
    const saved = await prisma.foodItem.upsert({
      where: {
        normalizedName_defaultUnit: {
          normalizedName: normalize(result.name),
          defaultUnit: result.unit,
        },
      },
      update: {},
      create: {
        name: result.name,
        normalizedName: normalize(result.name),
        source: result.source ?? "MANUAL",
        defaultUnit: result.unit,
        defaultQuantity: result.quantity,
        caloriesKcal: result.caloriesKcal,
        proteinG: result.proteinG,
        carbsG: result.carbsG,
        fatG: result.fatG,
        fiberG: result.fiberG,
      },
    });
    return { ...result, foodItemId: saved.id };
  } catch (e) {
    // Caching is best-effort; never fail a lookup because of it.
    console.error("[nutrition] cache write failed:", (e as Error).message);
    return result;
  }
}

/** Grams/millilitres per unit, for units that describe a measured amount. */
const MEASURED_UNITS: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  ml: 1, millilitre: 1, milliliter: 1, millilitres: 1, milliliters: 1,
  l: 1000, litre: 1000, liter: 1000, litres: 1000, liters: 1000,
};

function canonicalUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  // "pieces" -> "piece", "cups" -> "cup", etc.
  return u.endsWith("s") && !MEASURED_UNITS[u] ? u.replace(/s$/, "") : u;
}

/**
 * How many "default servings" the logged amount represents.
 *
 * Same unit          -> quantity / defaultQuantity   (2 pieces of a 1-piece item = 2)
 * Both measured      -> converted, then the same ratio (500ml vs a 250ml default = 2)
 * Serving-word vs measured -> treat the quantity as a count of default servings,
 *   so "1 glass of milk" against a 250ml default is 1 serving, not 1/250th.
 */
export function servingFactor(
  quantity: number,
  unit: string,
  defaultQuantity: number,
  defaultUnit: string,
): number {
  if (defaultQuantity <= 0) return quantity;

  const u = canonicalUnit(unit);
  const du = canonicalUnit(defaultUnit);

  if (u === du) return quantity / defaultQuantity;

  const uScale = MEASURED_UNITS[u];
  const duScale = MEASURED_UNITS[du];
  if (uScale && duScale) {
    return (quantity * uScale) / (defaultQuantity * duScale);
  }

  // Mismatched or non-measured units ("glass", "serving", "bowl"): the safest
  // reading is N standard servings.
  return quantity;
}

/** Scales stored per-default-quantity values to the logged quantity. */
function scale(
  base: {
    name: string;
    defaultQuantity: number;
    defaultUnit: string;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number | null;
    source: FoodSource;
    foodItemId: string;
  },
  quantity: number,
  unit: string,
): NutritionResult {
  const factor = servingFactor(quantity, unit, base.defaultQuantity, base.defaultUnit);
  const r = (v: number) => Math.round(v * factor * 100) / 100;

  return {
    name: base.name,
    quantity,
    unit,
    caloriesKcal: r(base.caloriesKcal),
    proteinG: r(base.proteinG),
    carbsG: r(base.carbsG),
    fatG: r(base.fatG),
    fiberG: base.fiberG === null ? null : r(base.fiberG),
    source: base.source,
    foodItemId: base.foodItemId,
    matched: true,
  };
}
