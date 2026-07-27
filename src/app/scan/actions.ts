"use server";

import { requireOnboardedUser } from "@/lib/user";
import { getToday } from "@/lib/date";
import { resolveDraft } from "@/lib/log/draft";
import { extractMealFromImage } from "@/lib/llm/vision";
import { ExtractionError } from "@/lib/llm/extract";
import { consumeLlmQuota, RateLimitError } from "@/lib/rate-limit";
import type { LogState } from "@/app/log/actions";

/** Max data-URL length we accept (~4.5MB of base64 ≈ ~3MB image). */
const MAX_IMAGE_CHARS = 4_500_000;

/**
 * Photo path: an image -> a reviewable draft, using the same nutrition
 * resolution as the chat flow. The confirm/save step is shared (confirmDraft).
 */
export async function analyzePhoto(
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const { user } = await requireOnboardedUser();

  const image = String(formData.get("image") ?? "");
  if (!image) return { error: "No photo was captured. Try again." };
  if (image.length > MAX_IMAGE_CHARS) {
    return { error: "That image is too large. Try again — it should shrink automatically." };
  }

  try {
    // Same daily quota as text extraction (a scan is an extraction).
    await consumeLlmQuota(user.id, "EXTRACTION", (await getToday()).date);

    const extracted = await extractMealFromImage(image);
    const draft = await resolveDraft(extracted);

    if (draft.meals.every((m) => m.items.length === 0) && draft.waterMl === 0) {
      return {
        error: "I couldn't spot any food in that photo. Try a closer, clearer shot.",
      };
    }
    return { draft, message: "Logged from a photo" };
  } catch (e) {
    if (e instanceof RateLimitError) return { error: e.message };
    if (e instanceof ExtractionError) return { error: e.message };
    console.error("[scan] analyze failed:", e);
    return { error: "Something went wrong reading that photo. Please try again." };
  }
}
