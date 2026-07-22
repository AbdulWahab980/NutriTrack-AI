"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildDraft, type LogDraft } from "@/lib/log/draft";
import { parseLocalDate, saveDraft, deleteMealEntry } from "@/lib/log/persist";
import { requireOnboardedUser } from "@/lib/user";
import { ExtractionError } from "@/lib/llm/extract";

export type LogState = {
  error?: string;
  draft?: LogDraft;
  message?: string;
  saved?: { calories: number; waterMl: number };
};

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.");

/** Step 1: analyse the message and return a draft for the user to confirm. */
export async function analyzeMessage(
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  await requireOnboardedUser();

  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 2) {
    return { error: "Tell me what you ate or drank." };
  }
  if (message.length > 2000) {
    return { error: "That's a bit long — try splitting it into two messages." };
  }

  try {
    const draft = await buildDraft(message);
    if (draft.meals.every((m) => m.items.length === 0) && draft.waterMl === 0) {
      return {
        message,
        error: "I didn't catch any food or drink in that. Try naming what you ate.",
      };
    }
    return { draft, message };
  } catch (e) {
    if (e instanceof ExtractionError) {
      return { error: e.message, message };
    }
    console.error("[log] analyze failed:", e);
    return { error: "Something went wrong reading that. Please try again." };
  }
}

/** Step 2: persist the confirmed draft. */
export async function confirmDraft(
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const { user } = await requireOnboardedUser();

  const dateResult = localDate.safeParse(formData.get("logDate"));
  if (!dateResult.success) {
    return { error: "Could not determine today's date. Please refresh." };
  }

  let draft: LogDraft;
  try {
    draft = JSON.parse(String(formData.get("draft") ?? ""));
  } catch {
    return { error: "That draft expired. Please describe your meal again." };
  }

  const message = String(formData.get("message") ?? "");

  try {
    const log = await saveDraft(user.id, draft, parseLocalDate(dateResult.data), message);
    revalidatePath("/today");
    revalidatePath("/log");
    return {
      saved: { calories: log.totalCalories, waterMl: log.totalWaterMl },
    };
  } catch (e) {
    console.error("[log] save failed:", e);
    return { error: (e as Error).message || "Could not save that. Please try again." };
  }
}

export async function removeEntry(formData: FormData) {
  const { user } = await requireOnboardedUser();
  const entryId = String(formData.get("entryId") ?? "");
  await deleteMealEntry(user.id, entryId);
  revalidatePath("/today");
  revalidatePath("/log");
}
