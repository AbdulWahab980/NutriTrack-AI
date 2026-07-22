/**
 * Seed dataset for common Pakistani / South Asian foods (spec §10).
 *
 * Nutrition APIs cover these poorly, so this local table is tier 1 of the
 * lookup chain and works with no external API keys at all.
 *
 * Values are per the stated default quantity/unit and are approximate
 * reference figures for typical home/mess preparation — recipes vary widely.
 * `approxCostPkr` is a rough 2026 street/mess price, used only to make hostel
 * suggestions budget-aware; it is not a live price.
 *
 * Treat this as a starting point to refine, not a nutritional authority.
 */

export type DesiFood = {
  name: string;
  defaultQuantity: number;
  defaultUnit: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  approxCostPkr?: number;
  /** Extra spellings/colloquialisms that should resolve to this item. */
  aliases?: string[];
};

export const DESI_FOODS: DesiFood[] = [
  // --- breads ---
  { name: "roti", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 120, proteinG: 3, carbsG: 25, fatG: 0.5, fiberG: 3, approxCostPkr: 20, aliases: ["chapati", "phulka", "tandoori roti"] },
  { name: "paratha", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 300, proteinG: 6, carbsG: 36, fatG: 15, fiberG: 3, approxCostPkr: 60 },
  { name: "naan", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 260, proteinG: 9, carbsG: 45, fatG: 5, fiberG: 2, approxCostPkr: 50 },
  { name: "bread slice", defaultQuantity: 1, defaultUnit: "slice", caloriesKcal: 70, proteinG: 2.5, carbsG: 13, fatG: 1, fiberG: 1, approxCostPkr: 15, aliases: ["double roti", "white bread"] },

  // --- rice & combos ---
  { name: "boiled rice", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 260, proteinG: 5, carbsG: 56, fatG: 0.5, fiberG: 1, approxCostPkr: 60, aliases: ["chawal", "plain rice", "steamed rice"] },
  { name: "daal chawal", defaultQuantity: 1, defaultUnit: "plate", caloriesKcal: 420, proteinG: 14, carbsG: 76, fatG: 6, fiberG: 8, approxCostPkr: 150, aliases: ["dal chawal", "daal rice", "dal rice"] },
  { name: "chicken biryani", defaultQuantity: 1, defaultUnit: "plate", caloriesKcal: 600, proteinG: 25, carbsG: 75, fatG: 22, fiberG: 3, approxCostPkr: 350, aliases: ["biryani", "biriyani"] },
  { name: "chicken pulao", defaultQuantity: 1, defaultUnit: "plate", caloriesKcal: 520, proteinG: 22, carbsG: 70, fatG: 17, fiberG: 2, approxCostPkr: 300, aliases: ["pulao", "yakhni pulao"] },

  // --- lentils & vegetables ---
  { name: "daal", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 180, proteinG: 9, carbsG: 27, fatG: 4, fiberG: 7, approxCostPkr: 80, aliases: ["dal", "masoor daal", "moong daal", "chana daal", "lentils"] },
  { name: "chana chaat", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 200, proteinG: 10, carbsG: 30, fatG: 4, fiberG: 8, approxCostPkr: 80, aliases: ["chana chat", "chola chaat"] },
  { name: "boiled chana", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 270, proteinG: 14, carbsG: 45, fatG: 4, fiberG: 12, approxCostPkr: 70, aliases: ["chickpeas", "chana", "chole"] },
  { name: "mixed vegetable sabzi", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 180, proteinG: 4, carbsG: 20, fatG: 9, fiberG: 5, approxCostPkr: 80, aliases: ["sabzi", "sabji", "vegetable curry"] },
  { name: "aloo bhujia", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 220, proteinG: 4, carbsG: 30, fatG: 10, fiberG: 4, approxCostPkr: 70, aliases: ["aloo ki sabzi", "potato curry"] },
  { name: "palak paneer", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 300, proteinG: 14, carbsG: 12, fatG: 22, fiberG: 4, approxCostPkr: 250 },

  // --- meat dishes ---
  { name: "chicken karahi", defaultQuantity: 1, defaultUnit: "serving", caloriesKcal: 450, proteinG: 35, carbsG: 8, fatG: 30, fiberG: 2, approxCostPkr: 500 },
  { name: "chicken curry", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 300, proteinG: 28, carbsG: 8, fatG: 18, fiberG: 1, approxCostPkr: 300, aliases: ["chicken salan"] },
  { name: "aloo gosht", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 350, proteinG: 22, carbsG: 18, fatG: 21, fiberG: 3, approxCostPkr: 350 },
  { name: "chicken tikka", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 200, proteinG: 25, carbsG: 2, fatG: 10, approxCostPkr: 250 },
  { name: "haleem", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 300, proteinG: 18, carbsG: 30, fatG: 12, fiberG: 5, approxCostPkr: 200 },
  { name: "nihari", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 450, proteinG: 30, carbsG: 12, fatG: 32, fiberG: 1, approxCostPkr: 400 },
  { name: "keema", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 380, proteinG: 26, carbsG: 6, fatG: 28, fiberG: 1, approxCostPkr: 350, aliases: ["qeema", "mince curry"] },

  // --- eggs & dairy ---
  { name: "boiled egg", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 78, proteinG: 6.3, carbsG: 0.6, fatG: 5.3, approxCostPkr: 30, aliases: ["egg", "anda", "uble ande"] },
  { name: "fried egg", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 110, proteinG: 6.5, carbsG: 0.6, fatG: 9, approxCostPkr: 35 },
  { name: "omelette", defaultQuantity: 1, defaultUnit: "serving", caloriesKcal: 220, proteinG: 13, carbsG: 2, fatG: 18, approxCostPkr: 80, aliases: ["anda omelette", "omelet"] },
  { name: "milk", defaultQuantity: 250, defaultUnit: "ml", caloriesKcal: 150, proteinG: 8, carbsG: 12, fatG: 8, approxCostPkr: 80, aliases: ["doodh", "glass of milk"] },
  { name: "yogurt", defaultQuantity: 1, defaultUnit: "cup", caloriesKcal: 120, proteinG: 7, carbsG: 9, fatG: 6, approxCostPkr: 60, aliases: ["dahi", "curd"] },
  { name: "lassi", defaultQuantity: 1, defaultUnit: "glass", caloriesKcal: 180, proteinG: 6, carbsG: 25, fatG: 6, approxCostPkr: 120, aliases: ["sweet lassi"] },
  { name: "paneer", defaultQuantity: 100, defaultUnit: "g", caloriesKcal: 265, proteinG: 18, carbsG: 3, fatG: 20, approxCostPkr: 200 },

  // --- drinks ---
  { name: "tea with milk", defaultQuantity: 1, defaultUnit: "cup", caloriesKcal: 90, proteinG: 2.5, carbsG: 12, fatG: 3, approxCostPkr: 50, aliases: ["chai", "chai with milk", "doodh patti", "milk tea", "tea"] },
  { name: "green tea", defaultQuantity: 1, defaultUnit: "cup", caloriesKcal: 2, proteinG: 0, carbsG: 0.4, fatG: 0, approxCostPkr: 30, aliases: ["qahwa", "black tea without sugar"] },
  { name: "soft drink", defaultQuantity: 250, defaultUnit: "ml", caloriesKcal: 105, proteinG: 0, carbsG: 27, fatG: 0, approxCostPkr: 80, aliases: ["coke", "pepsi", "cola", "sprite"] },

  // --- snacks & fast food ---
  { name: "samosa", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 260, proteinG: 5, carbsG: 30, fatG: 13, fiberG: 3, approxCostPkr: 40 },
  { name: "pakora", defaultQuantity: 100, defaultUnit: "g", caloriesKcal: 300, proteinG: 8, carbsG: 30, fatG: 17, fiberG: 4, approxCostPkr: 80, aliases: ["pakoray", "bhajiya"] },
  { name: "french fries", defaultQuantity: 100, defaultUnit: "g", caloriesKcal: 312, proteinG: 3.4, carbsG: 41, fatG: 15, fiberG: 4, approxCostPkr: 150, aliases: ["fries", "chips"] },
  { name: "chicken shawarma", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 450, proteinG: 25, carbsG: 45, fatG: 19, fiberG: 3, approxCostPkr: 250, aliases: ["shawarma"] },
  { name: "chicken burger", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 500, proteinG: 25, carbsG: 45, fatG: 25, fiberG: 2, approxCostPkr: 350, aliases: ["burger"] },
  { name: "biscuit", defaultQuantity: 2, defaultUnit: "piece", caloriesKcal: 100, proteinG: 1.5, carbsG: 15, fatG: 4, approxCostPkr: 20, aliases: ["cookies", "rusk"] },
  { name: "peanut butter", defaultQuantity: 1, defaultUnit: "tbsp", caloriesKcal: 95, proteinG: 4, carbsG: 3.5, fatG: 8, fiberG: 1, approxCostPkr: 40 },
  { name: "kheer", defaultQuantity: 1, defaultUnit: "bowl", caloriesKcal: 250, proteinG: 6, carbsG: 40, fatG: 7, approxCostPkr: 120, aliases: ["rice pudding"] },

  // --- fruit ---
  { name: "banana", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, fiberG: 3, approxCostPkr: 30, aliases: ["kela"] },
  { name: "apple", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3, fiberG: 4, approxCostPkr: 60, aliases: ["seb"] },
  { name: "orange", defaultQuantity: 1, defaultUnit: "piece", caloriesKcal: 62, proteinG: 1.2, carbsG: 15, fatG: 0.2, fiberG: 3, approxCostPkr: 40, aliases: ["kinnow", "santra"] },
  { name: "dates", defaultQuantity: 3, defaultUnit: "piece", caloriesKcal: 200, proteinG: 1.7, carbsG: 54, fatG: 0.3, fiberG: 5, approxCostPkr: 50, aliases: ["khajoor"] },
];
