"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/user";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL, requireEnv } from "@/lib/env";

export type SettingsState = { error?: string; ok?: boolean };

const remindersSchema = z.object({
  waterRemindersEnabled: z.boolean(),
  waterReminderIntervalMin: z.coerce.number().int().min(30).max(480),
  mealRemindersEnabled: z.boolean(),
  mealReminderHour: z.coerce.number().int().min(0).max(23),
  weeklySummaryEnabled: z.boolean(),
});

export async function saveReminderSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireAppUser();

  const parsed = remindersSchema.safeParse({
    waterRemindersEnabled: formData.get("waterRemindersEnabled") === "on",
    waterReminderIntervalMin: formData.get("waterReminderIntervalMin"),
    mealRemindersEnabled: formData.get("mealRemindersEnabled") === "on",
    mealReminderHour: formData.get("mealReminderHour"),
    weeklySummaryEnabled: formData.get("weeklySummaryEnabled") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.reminderSettings.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: { userId: user.id, ...parsed.data },
  });

  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true };
}

/**
 * Permanently deletes the account and everything attached to it (spec §4).
 *
 * Requires the user to type their email exactly — this is irreversible and
 * there is no undo, so a single misclick must not be enough.
 */
export async function deleteAccount(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireAppUser();

  const confirmation = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  if (confirmation !== user.email.toLowerCase()) {
    return { error: "That doesn't match your email address. Nothing was deleted." };
  }

  // Record the request before destroying anything, for the audit trail.
  await prisma.dataRequest.create({
    data: { userId: user.id, requestType: "DELETE" },
  });

  // Application data first — every related table cascades from User.
  await prisma.user.delete({ where: { id: user.id } });

  // Then the identity itself, so nothing is left behind in Supabase auth.
  try {
    const admin = createAdminClient(
      SUPABASE_URL,
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await admin.auth.admin.deleteUser(user.supabaseUserId);
  } catch (e) {
    // App data is already gone; surface this but don't fail the flow.
    console.error("[privacy] auth user deletion failed:", (e as Error).message);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
