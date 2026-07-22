import { ADVICE_MODEL, openai } from "./client";
import { screenForDisorderedEating } from "@/lib/safety/screen";
import type { Totals, Targets } from "@/lib/insights";

/**
 * Stage 2 of the pipeline (spec §7): verified numbers -> natural-language
 * feedback.
 *
 * The model receives totals as ground truth and is told not to recompute
 * them. It never sees raw food text, so it has nothing to derive numbers
 * from even if it tried.
 */

export type AdviceProfile = {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  goal: string;
  livingSituation: string;
  dailyFoodBudgetPkr: number | null;
  kitchenAccess: string | null;
  hasMessPlan: boolean | null;
  messNotes: string | null;
  dietaryRestrictions: string[];
};

export type AdviceResult =
  | { kind: "advice"; text: string }
  | { kind: "support"; categories: string[] };

const SYSTEM_PROMPT = `You are NutriTrack AI, a supportive nutrition-logging assistant.
You are NOT a doctor and must never diagnose or give medical verdicts.

You will receive:
1. The user's profile (age, weight, height, activity level, goal, living situation, budget if hostel)
2. Today's logged totals (calories, protein, carbs, fat, water) — these numbers come from a
   verified nutrition database, treat them as ground truth. Never recalculate or override them.
3. The user's daily targets

Your job:
- Compare totals to targets factually and specifically (use real numbers, e.g. "32g protein short")
- Never say the user "is healthy" or "is unhealthy" — describe gaps and patterns only
- If living_situation is "HOSTEL", suggestions must be budget-aware and realistic for
  mess-hall/limited-kitchen access — use the user's stated budget and what they can actually cook
- Suggestions must be specific and actionable (name a food, a quantity, and if hostel mode,
  an approximate cost in PKR)
- Never use moralizing language ("bad food," "cheat meal," "guilty")
- Respect the user's dietary restrictions absolutely — never suggest something they cannot eat
- Keep tone warm, direct, and non-judgmental — like a knowledgeable friend, not a clinician
- Always end with one concrete next action, not generic advice
- Respond in 3-5 sentences, plain text, no headers or markdown`;

/**
 * Generates advice, or returns a support result if the safety screen trips on
 * anything the user wrote today. When it trips, no API call is made at all.
 */
export async function generateAdvice(
  profile: AdviceProfile,
  totals: Totals,
  targets: Targets,
  recentMessages: string[] = [],
): Promise<AdviceResult> {
  const screened = screenForDisorderedEating(recentMessages.join("\n"));
  if (screened.flagged) {
    return { kind: "support", categories: screened.categories };
  }

  const context = {
    profile: {
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      activity_level: profile.activityLevel,
      goal: profile.goal,
      living_situation: profile.livingSituation,
      daily_food_budget_pkr: profile.dailyFoodBudgetPkr,
      kitchen_access: profile.kitchenAccess,
      has_mess_plan: profile.hasMessPlan,
      mess_notes: profile.messNotes,
      dietary_restrictions: profile.dietaryRestrictions,
    },
    daily_totals: {
      calories_kcal: Math.round(totals.caloriesKcal),
      protein_g: Math.round(totals.proteinG),
      carbs_g: Math.round(totals.carbsG),
      fat_g: Math.round(totals.fatG),
      water_ml: totals.waterMl,
    },
    targets: {
      target_calories: Math.round(targets.targetCalories),
      target_protein_g: Math.round(targets.targetProteinG),
      target_carbs_g: Math.round(targets.targetCarbsG),
      target_fat_g: Math.round(targets.targetFatG),
      target_water_ml: targets.targetWaterMl,
    },
  };

  const response = await openai().chat.completions.create({
    model: ADVICE_MODEL,
    max_tokens: 400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `Here is today's data:\n${JSON.stringify(context, null, 2)}\n\n` +
          `Generate the feedback message for the user now.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("No advice was generated. Please try again.");
  }
  return { kind: "advice", text };
}
