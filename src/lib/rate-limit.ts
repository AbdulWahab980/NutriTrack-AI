import { prisma } from "@/lib/prisma";
import type { LlmCallKind } from "@/generated/prisma/enums";

/**
 * Rate limiting for the LLM endpoints.
 *
 * Two layers, because they solve different problems:
 *   - burst (in-memory): stops a stuck client hammering the endpoint. Resets
 *     on deploy and is per-instance, which is fine for this purpose.
 *   - daily (database): the one that actually caps API spend. Durable and
 *     shared across instances.
 *
 * Limits are generous enough that ordinary use never notices them.
 */

export const DAILY_LIMITS: Record<LlmCallKind, number> = {
  EXTRACTION: 60,
  ADVICE: 20,
  HOSTEL: 20,
};

const BURST_MAX = 8;
const BURST_WINDOW_MS = 60_000;

const burst = new Map<string, number[]>();

export class RateLimitError extends Error {}

function checkBurst(key: string) {
  const now = Date.now();
  const hits = (burst.get(key) ?? []).filter((t) => now - t < BURST_WINDOW_MS);

  if (hits.length >= BURST_MAX) {
    throw new RateLimitError("You're going a bit fast — give it a minute.");
  }

  hits.push(now);
  burst.set(key, hits);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (burst.size > 5000) {
    for (const [k, v] of burst) {
      if (v.every((t) => now - t >= BURST_WINDOW_MS)) burst.delete(k);
    }
  }
}

/**
 * Records one LLM call against the user's quota, throwing if they are over.
 * Call this immediately BEFORE the API request so a failed call still counts
 * — otherwise an error loop would bypass the cap entirely.
 */
export async function consumeLlmQuota(
  userId: string,
  kind: LlmCallKind,
  usageDate: Date,
): Promise<void> {
  checkBurst(`${userId}:${kind}`);

  const usage = await prisma.llmUsage.upsert({
    where: { userId_usageDate_kind: { userId, usageDate, kind } },
    update: { count: { increment: 1 } },
    create: { userId, usageDate, kind, count: 1 },
  });

  if (usage.count > DAILY_LIMITS[kind]) {
    throw new RateLimitError(
      "You've hit today's limit for AI requests. It resets tomorrow.",
    );
  }
}
