"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/user";
import { calculateTargets } from "@/lib/targets";

export type OnboardingState = { error?: string };

const profileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Please enter your name.").max(150),
    age: z.coerce.number().int().min(10, "Age must be between 10 and 100.").max(100),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
    heightCm: z.coerce.number().min(80, "Enter a height in cm.").max(250),
    weightKg: z.coerce.number().min(20, "Enter a weight in kg.").max(400),
    activityLevel: z.enum([
      "SEDENTARY",
      "LIGHT",
      "MODERATE",
      "ACTIVE",
      "VERY_ACTIVE",
    ]),
    goal: z.enum([
      "WEIGHT_LOSS",
      "MUSCLE_GAIN",
      "MAINTENANCE",
      "GENERAL_HEALTH",
    ]),
    livingSituation: z.enum(["HOSTEL", "HOME", "PG", "OTHER"]),

    // Hostel branch — required only when livingSituation is HOSTEL.
    dailyFoodBudgetPkr: z.coerce.number().min(0).max(100000).optional(),
    hasMessPlan: z.boolean().optional(),
    messNotes: z.string().trim().max(1000).optional(),
    kitchenAccess: z
      .enum(["FRIDGE_ONLY", "KETTLE", "INDUCTION", "NONE"])
      .optional(),
    dietaryRestrictions: z.array(z.string().trim().min(1)).default([]),
  })
  .refine(
    (d) =>
      d.livingSituation !== "HOSTEL" ||
      (d.dailyFoodBudgetPkr !== undefined && d.kitchenAccess !== undefined),
    {
      message:
        "For hostel living, please provide your daily food budget and kitchen access.",
    },
  );

export async function saveProfile(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const livingSituation = String(formData.get("livingSituation") ?? "");
  const isHostel = livingSituation === "HOSTEL";

  const raw = {
    fullName: formData.get("fullName"),
    age: formData.get("age"),
    gender: formData.get("gender"),
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    activityLevel: formData.get("activityLevel"),
    goal: formData.get("goal"),
    livingSituation,
    // Hostel fields are ignored entirely unless the hostel branch is active,
    // so switching away from hostel cannot leave stale values behind.
    dailyFoodBudgetPkr: isHostel ? formData.get("dailyFoodBudgetPkr") || undefined : undefined,
    hasMessPlan: isHostel ? formData.get("hasMessPlan") === "on" : undefined,
    messNotes: isHostel ? String(formData.get("messNotes") ?? "") : undefined,
    kitchenAccess: isHostel ? formData.get("kitchenAccess") || undefined : undefined,
    dietaryRestrictions: formData.getAll("dietaryRestrictions").map(String),
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const d = parsed.data;

  // Targets are always derived, never user-entered (spec §3.1).
  const targets = calculateTargets({
    age: d.age,
    gender: d.gender,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    activityLevel: d.activityLevel,
    goal: d.goal,
  });

  const user = await requireAppUser();

  const data = {
    age: d.age,
    gender: d.gender,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    activityLevel: d.activityLevel,
    goal: d.goal,
    livingSituation: d.livingSituation,
    dailyFoodBudgetPkr: isHostel ? d.dailyFoodBudgetPkr : null,
    hasMessPlan: isHostel ? (d.hasMessPlan ?? false) : null,
    messNotes: isHostel ? d.messNotes || null : null,
    kitchenAccess: isHostel ? d.kitchenAccess : null,
    dietaryRestrictions: d.dietaryRestrictions,
    ...targets,
  };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { fullName: d.fullName },
    }),
    prisma.profile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    }),
  ]);

  revalidatePath("/", "layout");
  redirect("/today");
}
