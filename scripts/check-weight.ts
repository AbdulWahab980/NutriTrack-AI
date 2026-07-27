/**
 * Verifies weight logging (Bug 2) against the real database: per-day upsert,
 * history ordering, change calc, and ownership. Run with: npm run check:weight
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { parseLocalDate } from "../src/lib/log/persist";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const UID = "00000000-0000-4000-8000-0000000we1a7";

async function upsert(userId: string, iso: string, kg: number) {
  const logDate = parseLocalDate(iso);
  return prisma.weightEntry.upsert({
    where: { userId_logDate: { userId, logDate } },
    update: { weightKg: kg },
    create: { userId, logDate, weightKg: kg },
  });
}

async function main() {
  await prisma.user.deleteMany({ where: { supabaseUserId: UID } });
  const user = await prisma.user.create({
    data: { supabaseUserId: UID, email: "weight-check@example.invalid" },
  });

  await upsert(user.id, "2026-07-20", 68.0);
  await upsert(user.id, "2026-07-22", 67.4);
  await upsert(user.id, "2026-07-25", 66.9);

  let entries = await prisma.weightEntry.findMany({
    where: { userId: user.id }, orderBy: { logDate: "asc" },
  });
  console.log("entries:", entries.map((e) => `${e.logDate.toISOString().slice(0, 10)}=${e.weightKg}`).join(", "));
  ok(entries.length === 3, `should have 3 entries, got ${entries.length}`);

  // Re-logging the same day overwrites, not duplicates.
  await upsert(user.id, "2026-07-22", 67.1);
  entries = await prisma.weightEntry.findMany({ where: { userId: user.id }, orderBy: { logDate: "asc" } });
  ok(entries.length === 3, `re-logging a day must overwrite, got ${entries.length} entries`);
  ok(entries[1].weightKg === 67.1, `overwrite should update the value, got ${entries[1].weightKg}`);

  // Change since first weigh-in.
  const change = Math.round((entries[entries.length - 1].weightKg - entries[0].weightKg) * 10) / 10;
  console.log("change since first:", change, "kg");
  ok(change === -1.1, `change should be -1.1, got ${change}`);

  // Ordering ascending by date.
  const dates = entries.map((e) => e.logDate.getTime());
  ok(dates.every((d, i) => i === 0 || dates[i - 1] <= d), "entries must be date-ordered ascending");

  // Cascade + ownership: entries vanish with the user.
  await prisma.user.delete({ where: { id: user.id } });
  const left = await prisma.weightEntry.count({ where: { userId: user.id } });
  ok(left === 0, `weight entries must cascade on user delete, found ${left}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll weight checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
