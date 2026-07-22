import { prisma } from "@/lib/prisma";
import { ADVICE_MODEL, openai } from "@/lib/llm/client";
import { screenForDisorderedEating } from "@/lib/safety/screen";
import type { Gap } from "@/lib/insights";

/**
 * Hostel mode (spec §3.5): budget-aware, mess-realistic add-on suggestions.
 *
 * The model does not invent foods or prices. We shortlist real rows from our
 * own priced dataset and instruct it to choose from that list only — same
 * principle as the nutrition numbers.
 */

export type Candidate = {
  name: string;
  proteinG: number;
  caloriesKcal: number;
  costPkr: number;
  unit: string;
  quantity: number;
};

/** Items needing no stove — safe when the user has no cooking access. */
const NO_COOK = new Set([
  "banana", "apple", "orange", "dates", "milk", "yogurt", "dahi", "curd",
  "peanut butter", "biscuit", "boiled egg", "bread slice", "lassi",
  "chana chaat", "boiled chana", "chickpeas", "kela", "seb", "doodh",
]);

/** Crude restriction filter — excludes obvious conflicts by name. */
const RESTRICTION_EXCLUSIONS: Record<string, string[]> = {
  vegetarian: ["chicken", "beef", "mutton", "keema", "qeema", "gosht", "nihari", "haleem", "fish", "tikka", "shawarma", "burger", "biryani", "pulao"],
  vegan: ["chicken", "beef", "mutton", "keema", "qeema", "gosht", "nihari", "haleem", "fish", "tikka", "shawarma", "burger", "biryani", "pulao", "milk", "yogurt", "dahi", "curd", "paneer", "lassi", "egg", "kheer", "doodh"],
  lactose_intolerant: ["milk", "yogurt", "dahi", "curd", "paneer", "lassi", "kheer", "doodh", "tea with milk", "chai", "doodh patti", "milk tea"],
  nut_allergy: ["peanut butter"],
  gluten_free: ["roti", "chapati", "paratha", "naan", "bread", "samosa", "biscuit", "burger", "shawarma", "phulka", "double roti", "rusk"],
};

/**
 * Shortlists affordable, high-protein options the user can actually obtain.
 * Ranked by protein per rupee — the metric that matters on a tight budget.
 */
export async function getAffordableProteinOptions(
  budgetPkr: number | null,
  kitchenAccess: string | null,
  dietaryRestrictions: string[],
  limit = 10,
): Promise<Candidate[]> {
  const rows = await prisma.foodItem.findMany({
    where: {
      source: "CUSTOM_DESI",
      approxCostPkr: { not: null, gt: 0 },
      proteinG: { gt: 2 },
    },
  });

  const noCookOnly = kitchenAccess === "NONE" || kitchenAccess === "FRIDGE_ONLY";
  const excluded = new Set(
    dietaryRestrictions.flatMap((r) => RESTRICTION_EXCLUSIONS[r] ?? []),
  );
  // A single item shouldn't eat the whole day's budget.
  const perItemCap = budgetPkr ? budgetPkr * 0.5 : Infinity;

  const seen = new Set<string>();
  return rows
    .filter((r) => {
      const n = r.name.toLowerCase();
      if (excluded.has(n) || [...excluded].some((e) => n.includes(e))) return false;
      if (noCookOnly && !NO_COOK.has(n)) return false;
      if ((r.approxCostPkr ?? 0) > perItemCap) return false;
      // Aliases share values; keep one row per nutrition signature.
      const key = `${r.proteinG}:${r.caloriesKcal}:${r.approxCostPkr}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        b.proteinG / (b.approxCostPkr || 1) - a.proteinG / (a.approxCostPkr || 1),
    )
    .slice(0, limit)
    .map((r) => ({
      name: r.name,
      proteinG: r.proteinG,
      caloriesKcal: r.caloriesKcal,
      costPkr: r.approxCostPkr ?? 0,
      unit: r.defaultUnit,
      quantity: r.defaultQuantity,
    }));
}

const SYSTEM_PROMPT = `You are NutriTrack AI helping a hostel student close today's nutrition gaps.

Hard rules:
- Suggest ONLY foods from the provided candidate list. Do not invent foods.
- Use ONLY the costs and nutrition values given for those candidates. Never invent a price.
- Respect the stated budget: your total suggestion must fit within the remaining budget.
- Respect kitchen access — if they cannot cook, only suggest what needs no cooking.
- Respect all dietary restrictions absolutely.
- Never say the user "is healthy" or "unhealthy". No moralising language
  ("bad food", "cheat meal", "guilty"). Describe gaps and actions only.
- Be specific: name the food, the quantity, the protein it adds, and the cost in PKR.
- If the mess menu already covers a gap, say so instead of adding something.
- 2-4 sentences, plain text, no markdown. End with one concrete next action.`;

export type HostelSuggestion =
  | { kind: "suggestion"; text: string; candidates: Candidate[] }
  | { kind: "support" };

export async function generateHostelSuggestions(opts: {
  budgetPkr: number | null;
  spentTodayPkr: number;
  kitchenAccess: string | null;
  dietaryRestrictions: string[];
  messDescription: string;
  gaps: Gap[];
}): Promise<HostelSuggestion> {
  if (screenForDisorderedEating(opts.messDescription).flagged) {
    return { kind: "support" };
  }

  const candidates = await getAffordableProteinOptions(
    opts.budgetPkr,
    opts.kitchenAccess,
    opts.dietaryRestrictions,
  );

  const remaining =
    opts.budgetPkr === null ? null : Math.max(0, opts.budgetPkr - opts.spentTodayPkr);

  const context = {
    daily_budget_pkr: opts.budgetPkr,
    spent_today_pkr: Math.round(opts.spentTodayPkr),
    remaining_budget_pkr: remaining === null ? null : Math.round(remaining),
    kitchen_access: opts.kitchenAccess,
    dietary_restrictions: opts.dietaryRestrictions,
    mess_serving_today: opts.messDescription || "(not specified)",
    todays_gaps: opts.gaps.map((g) => `${g.label}: ${g.remaining}${g.unit} short`),
    candidate_foods: candidates.map((c) => ({
      name: c.name,
      serving: `${c.quantity} ${c.unit}`,
      protein_g: c.proteinG,
      calories_kcal: c.caloriesKcal,
      cost_pkr: c.costPkr,
    })),
  };

  const response = await openai().chat.completions.create({
    model: ADVICE_MODEL,
    max_tokens: 350,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `${JSON.stringify(context, null, 2)}\n\n` +
          `Suggest what to add today, choosing only from candidate_foods.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("No suggestion was generated.");
  return { kind: "suggestion", text, candidates };
}
