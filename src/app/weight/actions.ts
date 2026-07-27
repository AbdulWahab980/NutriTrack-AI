"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/user";
import { getToday } from "@/lib/date";
import { parseLocalDate } from "@/lib/log/persist";

export type WeightState = { error?: string; ok?: boolean };

const schema = z.object({
  weightKg: z.coerce
    .number()
    .min(20, "Enter a weight between 20 and 400 kg.")
    .max(400, "Enter a weight between 20 and 400 kg."),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
});

/**
 * Records a weight for a chosen date (defaults to today, one entry per day so
 * re-logging the same day overwrites). This is tracking history — it does NOT
 * change the profile's configured weight or recalculate targets; that stays on
 * the Profile screen, per the app's separation of tracking vs configuration.
 */
export async function logWeight(
  _prev: WeightState,
  formData: FormData,
): Promise<WeightState> {
  const { user } = await requireOnboardedUser();

  const parsed = schema.safeParse({
    weightKg: formData.get("weightKg"),
    logDate: formData.get("logDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { iso: todayIso } = await getToday();
  if (parsed.data.logDate > todayIso) {
    return { error: "You can't log a weight for a future date." };
  }

  const logDate = parseLocalDate(parsed.data.logDate);
  await prisma.weightEntry.upsert({
    where: { userId_logDate: { userId: user.id, logDate } },
    update: { weightKg: parsed.data.weightKg },
    create: { userId: user.id, logDate, weightKg: parsed.data.weightKg },
  });

  revalidatePath("/weight");
  revalidatePath("/trends");
  return { ok: true };
}

export async function removeWeight(formData: FormData) {
  const { user } = await requireOnboardedUser();
  const id = String(formData.get("id") ?? "");

  const entry = await prisma.weightEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) return;

  await prisma.weightEntry.delete({ where: { id } });
  revalidatePath("/weight");
  revalidatePath("/trends");
}
