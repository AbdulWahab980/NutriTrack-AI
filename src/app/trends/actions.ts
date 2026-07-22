"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/user";
import { getToday } from "@/lib/date";

export type WeightState = { error?: string; ok?: boolean };

const weightSchema = z.coerce
  .number()
  .min(20, "Enter a weight between 20 and 400 kg.")
  .max(400, "Enter a weight between 20 and 400 kg.");

/**
 * Records today's weight. Also updates the profile's current weight so
 * targets stay consistent with reality — they are recalculated from it.
 */
export async function logWeight(
  _prev: WeightState,
  formData: FormData,
): Promise<WeightState> {
  const { user } = await requireOnboardedUser();

  const parsed = weightSchema.safeParse(formData.get("weightKg"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { date } = await getToday();

  await prisma.weightEntry.upsert({
    where: { userId_logDate: { userId: user.id, logDate: date } },
    update: { weightKg: parsed.data },
    create: { userId: user.id, logDate: date, weightKg: parsed.data },
  });

  revalidatePath("/trends");
  return { ok: true };
}
