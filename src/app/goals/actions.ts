"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/user";
import { calculateTargets } from "@/lib/targets";

export type GoalState = { error?: string; ok?: boolean };

const schema = z.object({
  goal: z.enum(["WEIGHT_LOSS", "MUSCLE_GAIN", "MAINTENANCE", "GENERAL_HEALTH"]),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]),
});

/**
 * Updates the user's goal (and activity level, which also drives the numbers)
 * and recalculates every daily target from it — same derivation as onboarding,
 * so targets are always consistent with the goal and never hand-edited.
 */
export async function updateGoal(
  _prev: GoalState,
  formData: FormData,
): Promise<GoalState> {
  const { user, profile } = await requireOnboardedUser();

  const parsed = schema.safeParse({
    goal: formData.get("goal"),
    activityLevel: formData.get("activityLevel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const targets = calculateTargets({
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activityLevel: parsed.data.activityLevel,
    goal: parsed.data.goal,
  });

  await prisma.profile.update({
    where: { userId: user.id },
    data: { goal: parsed.data.goal, activityLevel: parsed.data.activityLevel, ...targets },
  });

  revalidatePath("/goals");
  revalidatePath("/today");
  revalidatePath("/profile");
  return { ok: true };
}
