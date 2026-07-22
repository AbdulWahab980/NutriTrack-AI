/**
 * End-to-end check of the Phase 1 data path against the real database:
 * schema accepts profile data, targets persist, and the hostel branch clears
 * correctly when a user moves out of hostel living.
 *
 * Creates and then deletes its own test rows. Run with: npm run check:db
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { calculateTargets } from "../src/lib/targets";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const TEST_UID = "00000000-0000-4000-8000-00000000dead";
const TEST_EMAIL = "phase1-check@example.invalid";

async function main() {
  // Clean any leftovers from a previous run.
  await prisma.user.deleteMany({ where: { supabaseUserId: TEST_UID } });

  const user = await prisma.user.create({
    data: { supabaseUserId: TEST_UID, email: TEST_EMAIL, fullName: "Test Student" },
  });
  ok(!!user.id, "user row should be created");

  // --- hostel profile ---
  const inputs = {
    age: 21,
    gender: "MALE",
    heightCm: 175,
    weightKg: 68,
    activityLevel: "MODERATE",
    goal: "MUSCLE_GAIN",
  } as const;
  const targets = calculateTargets(inputs);

  const created = await prisma.profile.create({
    data: {
      userId: user.id,
      ...inputs,
      livingSituation: "HOSTEL",
      dailyFoodBudgetPkr: 500,
      hasMessPlan: true,
      messNotes: "roti and daal most nights",
      kitchenAccess: "KETTLE",
      dietaryRestrictions: ["vegetarian", "lactose_intolerant"],
      ...targets,
    },
  });

  ok(created.livingSituation === "HOSTEL", "living situation persisted");
  ok(created.kitchenAccess === "KETTLE", "kitchen access enum persisted");
  ok(created.dailyFoodBudgetPkr === 500, "hostel budget persisted");
  ok(
    created.dietaryRestrictions.length === 2 &&
      created.dietaryRestrictions.includes("vegetarian"),
    "dietary restrictions array persisted",
  );
  ok(
    Math.abs(created.targetCalories - targets.targetCalories) < 0.01,
    "calorie target round-trips exactly",
  );
  ok(created.targetWaterMl === targets.targetWaterMl, "water target round-trips");
  console.log("hostel profile:", {
    living: created.livingSituation,
    budget: created.dailyFoodBudgetPkr,
    kitchen: created.kitchenAccess,
    kcal: created.targetCalories,
    water: created.targetWaterMl,
  });

  // --- switch to HOME: hostel fields must be cleared, targets recomputed ---
  const newInputs = { ...inputs, weightKg: 72, goal: "MAINTENANCE" } as const;
  const newTargets = calculateTargets(newInputs);
  const updated = await prisma.profile.update({
    where: { userId: user.id },
    data: {
      ...newInputs,
      livingSituation: "HOME",
      dailyFoodBudgetPkr: null,
      hasMessPlan: null,
      messNotes: null,
      kitchenAccess: null,
      ...newTargets,
    },
  });

  ok(updated.dailyFoodBudgetPkr === null, "budget cleared when leaving hostel");
  ok(updated.kitchenAccess === null, "kitchen access cleared when leaving hostel");
  ok(updated.messNotes === null, "mess notes cleared when leaving hostel");
  ok(
    updated.targetCalories !== created.targetCalories,
    "targets recomputed after profile change",
  );
  console.log("after switch to HOME:", {
    living: updated.livingSituation,
    budget: updated.dailyFoodBudgetPkr,
    kcal: updated.targetCalories,
  });

  // --- cascade delete ---
  await prisma.user.delete({ where: { id: user.id } });
  const orphan = await prisma.profile.findUnique({ where: { userId: user.id } });
  ok(orphan === null, "profile cascade-deletes with its user");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll database checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e.message);
    process.exit(1);
  });
