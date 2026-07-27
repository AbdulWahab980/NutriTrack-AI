"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOnboardedUser } from "@/lib/user";
import { getToday } from "@/lib/date";
import { logWaterForUser, removeWaterForUser } from "@/lib/log/water";

export type WaterState = { error?: string; ok?: boolean };

const amountSchema = z.coerce
  .number()
  .int("Enter a whole number of millilitres.")
  .min(1, "Enter an amount above 0.")
  .max(5000, "That's a lot at once — keep it under 5000 ml.");

export async function addWater(
  _prev: WaterState,
  formData: FormData,
): Promise<WaterState> {
  const { user } = await requireOnboardedUser();

  const parsed = amountSchema.safeParse(formData.get("amountMl"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { date } = await getToday();
  try {
    await logWaterForUser(user.id, parsed.data, date);
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/water");
  revalidatePath("/today");
  return { ok: true };
}

export async function removeWater(formData: FormData) {
  const { user } = await requireOnboardedUser();
  const entryId = String(formData.get("entryId") ?? "");
  try {
    await removeWaterForUser(user.id, entryId);
  } catch {
    return;
  }
  revalidatePath("/water");
  revalidatePath("/today");
}
