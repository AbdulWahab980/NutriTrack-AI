"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/user";
import { getToday } from "@/lib/date";
import { generateAdvice } from "@/lib/llm/advice";
import { consumeLlmQuota, RateLimitError } from "@/lib/rate-limit";

export type AdviceState = {
  error?: string;
  text?: string;
  support?: boolean;
  feedbackId?: string;
};

export async function requestAdvice(
  _prev: AdviceState,
  _formData: FormData,
): Promise<AdviceState> {
  const { user, profile } = await requireOnboardedUser();
  const { date } = await getToday();

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId: user.id, logDate: date } },
    include: { mealEntries: { select: { rawInputText: true } } },
  });

  if (!dailyLog || dailyLog.mealEntries.length === 0) {
    return { error: "Log something first and I'll have numbers to work with." };
  }

  // Everything the user wrote today, for the safety screen.
  const messages = [...new Set(dailyLog.mealEntries.map((e) => e.rawInputText))];

  try {
    await consumeLlmQuota(user.id, "ADVICE", date);
    const result = await generateAdvice(
      {
        age: profile.age,
        gender: profile.gender,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        livingSituation: profile.livingSituation,
        dailyFoodBudgetPkr: profile.dailyFoodBudgetPkr,
        kitchenAccess: profile.kitchenAccess,
        hasMessPlan: profile.hasMessPlan,
        messNotes: profile.messNotes,
        dietaryRestrictions: profile.dietaryRestrictions,
      },
      {
        caloriesKcal: dailyLog.totalCalories,
        proteinG: dailyLog.totalProteinG,
        carbsG: dailyLog.totalCarbsG,
        fatG: dailyLog.totalFatG,
        waterMl: dailyLog.totalWaterMl,
      },
      profile,
      messages,
    );

    if (result.kind === "support") {
      await prisma.aiFeedback.create({
        data: {
          dailyLogId: dailyLog.id,
          feedbackText: "[suppressed: safety screen]",
          flaggedDisorderedEating: true,
        },
      });
      revalidatePath("/today");
      return { support: true };
    }

    const saved = await prisma.aiFeedback.create({
      data: { dailyLogId: dailyLog.id, feedbackText: result.text },
    });
    revalidatePath("/today");
    return { text: result.text, feedbackId: saved.id };
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    console.error("[advice] generation failed:", e);
    return { error: "Couldn't generate guidance right now. Please try again." };
  }
}

export async function rateAdvice(formData: FormData) {
  const { user } = await requireOnboardedUser();
  const feedbackId = String(formData.get("feedbackId") ?? "");
  const rating = Number(formData.get("rating"));
  if (![1, -1].includes(rating)) return;

  // Ownership check — never trust an id from the client.
  const feedback = await prisma.aiFeedback.findUnique({
    where: { id: feedbackId },
    include: { dailyLog: { select: { userId: true } } },
  });
  if (!feedback || feedback.dailyLog.userId !== user.id) return;

  await prisma.aiFeedback.update({
    where: { id: feedbackId },
    data: { userRating: rating },
  });
  revalidatePath("/today");
}
