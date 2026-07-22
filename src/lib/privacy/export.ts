import { prisma } from "@/lib/prisma";

/**
 * Full data export (spec §4: GDPR-style export).
 *
 * Exports everything the user has entered, not a summary — the point is that
 * they can take their history elsewhere.
 */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\n");
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export async function buildExportCsv(userId: string): Promise<string> {
  const [user, logs, weights, messItems] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    prisma.dailyLog.findMany({
      where: { userId },
      include: {
        mealEntries: { orderBy: { loggedAt: "asc" } },
        waterEntries: { orderBy: { loggedAt: "asc" } },
        aiFeedback: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { logDate: "asc" },
    }),
    prisma.weightEntry.findMany({ where: { userId }, orderBy: { logDate: "asc" } }),
    prisma.hostelMessItem.findMany({ where: { userId } }),
  ]);

  if (!user) throw new Error("User not found.");

  const sections: string[] = [];

  sections.push("# NutriTrack AI data export");
  sections.push(`# Generated ${new Date().toISOString()}`);
  sections.push(`# Account ${user.email}`);
  sections.push("");

  // --- profile ---
  sections.push("## Profile");
  if (user.profile) {
    const p = user.profile;
    sections.push(
      toCsv(
        ["field", "value"],
        [
          ["name", user.fullName],
          ["email", user.email],
          ["age", p.age],
          ["gender", p.gender],
          ["height_cm", p.heightCm],
          ["weight_kg", p.weightKg],
          ["activity_level", p.activityLevel],
          ["goal", p.goal],
          ["living_situation", p.livingSituation],
          ["daily_food_budget_pkr", p.dailyFoodBudgetPkr],
          ["kitchen_access", p.kitchenAccess],
          ["has_mess_plan", p.hasMessPlan],
          ["mess_notes", p.messNotes],
          ["dietary_restrictions", p.dietaryRestrictions.join("; ")],
          ["bmr_kcal", p.bmrKcal],
          ["tdee_kcal", p.tdeeKcal],
          ["target_calories", p.targetCalories],
          ["target_protein_g", p.targetProteinG],
          ["target_carbs_g", p.targetCarbsG],
          ["target_fat_g", p.targetFatG],
          ["target_water_ml", p.targetWaterMl],
        ],
      ),
    );
  }
  sections.push("");

  // --- daily totals ---
  sections.push("## Daily totals");
  sections.push(
    toCsv(
      ["date", "calories", "protein_g", "carbs_g", "fat_g", "water_ml"],
      logs.map((l) => [
        isoDate(l.logDate),
        l.totalCalories,
        l.totalProteinG,
        l.totalCarbsG,
        l.totalFatG,
        l.totalWaterMl,
      ]),
    ),
  );
  sections.push("");

  // --- meal entries ---
  sections.push("## Meal entries");
  sections.push(
    toCsv(
      [
        "date", "logged_at", "meal", "food", "quantity", "unit",
        "calories", "protein_g", "carbs_g", "fat_g", "cost_pkr",
        "confidence", "needs_manual_entry", "original_message",
      ],
      logs.flatMap((l) =>
        l.mealEntries.map((e) => [
          isoDate(l.logDate), e.loggedAt.toISOString(), e.mealType, e.foodName,
          e.quantity, e.unit, e.caloriesKcal, e.proteinG, e.carbsG, e.fatG,
          e.estimatedCostPkr, e.extractionConfidence, e.needsManualEntry,
          e.rawInputText,
        ]),
      ),
    ),
  );
  sections.push("");

  // --- water ---
  sections.push("## Water entries");
  sections.push(
    toCsv(
      ["date", "logged_at", "amount_ml"],
      logs.flatMap((l) =>
        l.waterEntries.map((w) => [
          isoDate(l.logDate), w.loggedAt.toISOString(), w.amountMl,
        ]),
      ),
    ),
  );
  sections.push("");

  // --- weight ---
  sections.push("## Weight entries");
  sections.push(
    toCsv(
      ["date", "weight_kg"],
      weights.map((w) => [isoDate(w.logDate), w.weightKg]),
    ),
  );
  sections.push("");

  // --- generated guidance ---
  sections.push("## AI guidance history");
  sections.push(
    toCsv(
      ["date", "created_at", "feedback", "rating", "suppressed_by_safety_screen"],
      logs.flatMap((l) =>
        l.aiFeedback.map((f) => [
          isoDate(l.logDate), f.createdAt.toISOString(), f.feedbackText,
          f.userRating, f.flaggedDisorderedEating,
        ]),
      ),
    ),
  );
  sections.push("");

  // --- mess menu ---
  if (messItems.length > 0) {
    sections.push("## Saved mess menu");
    sections.push(
      toCsv(
        ["day_of_week", "meal", "description"],
        messItems.map((m) => [m.dayOfWeek ?? "any", m.mealType, m.description]),
      ),
    );
  }

  return sections.join("\n");
}
