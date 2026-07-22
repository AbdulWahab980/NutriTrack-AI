"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/user";
import { getToday } from "@/lib/date";
import { computeGaps } from "@/lib/insights";
import { generateHostelSuggestions } from "@/lib/hostel/suggest";
import { getSpendForDate } from "@/lib/hostel/budget";

export type HostelState = {
  error?: string;
  text?: string;
  support?: boolean;
};

export async function suggestAddOns(
  _prev: HostelState,
  formData: FormData,
): Promise<HostelState> {
  const { user, profile } = await requireOnboardedUser();
  if (profile.livingSituation !== "HOSTEL") {
    return { error: "Hostel mode is only available for hostel living." };
  }

  const messDescription = String(formData.get("messDescription") ?? "").trim().slice(0, 500);
  const { date } = await getToday();

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId: user.id, logDate: date } },
  });

  const totals = {
    caloriesKcal: dailyLog?.totalCalories ?? 0,
    proteinG: dailyLog?.totalProteinG ?? 0,
    carbsG: dailyLog?.totalCarbsG ?? 0,
    fatG: dailyLog?.totalFatG ?? 0,
    waterMl: dailyLog?.totalWaterMl ?? 0,
  };

  try {
    const result = await generateHostelSuggestions({
      budgetPkr: profile.dailyFoodBudgetPkr,
      spentTodayPkr: await getSpendForDate(user.id, date),
      kitchenAccess: profile.kitchenAccess,
      dietaryRestrictions: profile.dietaryRestrictions,
      messDescription,
      gaps: computeGaps(totals, profile),
    });

    if (result.kind === "support") return { support: true };
    return { text: result.text };
  } catch (e) {
    console.error("[hostel] suggestion failed:", e);
    return { error: "Couldn't generate suggestions right now. Please try again." };
  }
}

const messItemSchema = z.object({
  description: z.string().trim().min(2).max(300),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  dayOfWeek: z.coerce.number().int().min(0).max(6).nullable(),
});

export async function addMessItem(formData: FormData) {
  const { user, profile } = await requireOnboardedUser();
  if (profile.livingSituation !== "HOSTEL") return;

  const rawDay = formData.get("dayOfWeek");
  const parsed = messItemSchema.safeParse({
    description: formData.get("description"),
    mealType: formData.get("mealType"),
    dayOfWeek: rawDay === "any" || rawDay === null ? null : rawDay,
  });
  if (!parsed.success) return;

  await prisma.hostelMessItem.create({
    data: { userId: user.id, ...parsed.data },
  });
  revalidatePath("/hostel");
}

export async function deleteMessItem(formData: FormData) {
  const { user } = await requireOnboardedUser();
  const id = String(formData.get("id") ?? "");

  // Ownership check before deleting.
  const item = await prisma.hostelMessItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return;

  await prisma.hostelMessItem.delete({ where: { id } });
  revalidatePath("/hostel");
}
