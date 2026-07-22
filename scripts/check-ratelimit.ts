/**
 * Checks LLM rate limiting and that usage rows are cleaned up with the
 * account. Run with: npm run check:ratelimit
 */
import "dotenv/config";
import { consumeLlmQuota, RateLimitError, DAILY_LIMITS } from "../src/lib/rate-limit";
import { prisma } from "../src/lib/prisma";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const UID = "00000000-0000-4000-8000-00000000ra7e";
const DATE = new Date(Date.UTC(2026, 6, 22));

async function main() {
  await prisma.user.deleteMany({ where: { supabaseUserId: UID } });
  const user = await prisma.user.create({
    data: { supabaseUserId: UID, email: "ratelimit@example.invalid" },
  });

  // --- burst limiter: 8 per minute, so the 9th must be refused ---
  let trippedAt = 0;
  for (let i = 1; i <= 15; i++) {
    try {
      await consumeLlmQuota(user.id, "ADVICE", DATE);
    } catch (e) {
      if (e instanceof RateLimitError) {
        trippedAt = i;
        break;
      }
      throw e;
    }
  }
  console.log(`burst limit tripped on call #${trippedAt} (allowance is 8/min)`);
  ok(trippedAt === 9, `burst should trip on the 9th call, tripped at ${trippedAt}`);

  // --- daily cap: a different kind has its own burst budget ---
  await prisma.llmUsage.create({
    data: {
      userId: user.id, usageDate: DATE, kind: "EXTRACTION",
      count: DAILY_LIMITS.EXTRACTION,
    },
  });
  let dailyRefused = false;
  try {
    await consumeLlmQuota(user.id, "EXTRACTION", DATE);
  } catch (e) {
    if (e instanceof RateLimitError) {
      dailyRefused = true;
      console.log("daily cap refused:", e.message);
    } else throw e;
  }
  ok(dailyRefused, "daily cap must refuse once the limit is reached");

  // --- a failed call still counts, so an error loop cannot bypass the cap ---
  const row = await prisma.llmUsage.findUnique({
    where: { userId_usageDate_kind: { userId: user.id, usageDate: DATE, kind: "EXTRACTION" } },
  });
  ok(
    (row?.count ?? 0) > DAILY_LIMITS.EXTRACTION,
    "the refused call should still have been counted",
  );

  // --- usage rows must be removed with the account (spec §4) ---
  await prisma.user.delete({ where: { id: user.id } });
  const leftover = await prisma.llmUsage.count({ where: { userId: user.id } });
  console.log("llm_usage rows remaining after account deletion:", leftover);
  ok(leftover === 0, `deleting the account must remove usage rows, found ${leftover}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll rate limit checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
