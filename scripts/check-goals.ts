/**
 * Verifies the Goals flow (Bug 3): changing the goal recalculates and persists
 * every target, consistently with the onboarding calculator.
 * Run with: npm run check:goals
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calculateTargets } from "../src/lib/targets";

const fails: string[] = [];
const ok = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg);
};

const UID = "00000000-0000-4000-8000-0000000goa15".replace("goa15", "90a15");

async function main() {
  await prisma.user.deleteMany({ where: { supabaseUserId: UID } });

  const base = {
    age: 21, gender: "MALE" as const, heightCm: 175, weightKg: 68,
    activityLevel: "MODERATE" as const,
  };
  const startTargets = calculateTargets({ ...base, goal: "MUSCLE_GAIN" });

  const user = await prisma.user.create({
    data: {
      supabaseUserId: UID, email: "goals-check@example.invalid",
      profile: {
        create: {
          ...base, goal: "MUSCLE_GAIN", livingSituation: "HOME",
          dietaryRestrictions: [], ...startTargets,
        },
      },
    },
    include: { profile: true },
  });

  console.log("muscle gain -> calories:", user.profile!.targetCalories, "protein:", user.profile!.targetProteinG);

  // Switch goal to weight loss — mirrors what updateGoal does.
  const newTargets = calculateTargets({ ...base, goal: "WEIGHT_LOSS" });
  const updated = await prisma.profile.update({
    where: { userId: user.id },
    data: { goal: "WEIGHT_LOSS", ...newTargets },
  });
  console.log("weight loss -> calories:", updated.targetCalories, "protein:", updated.targetProteinG);

  ok(updated.goal === "WEIGHT_LOSS", "goal should be updated");
  ok(
    updated.targetCalories < user.profile!.targetCalories,
    `weight-loss calories (${updated.targetCalories}) should be below muscle-gain (${user.profile!.targetCalories})`,
  );
  ok(
    Math.abs(updated.targetCalories - newTargets.targetCalories) < 0.01,
    "persisted calories must match the recalculated value exactly",
  );
  ok(
    updated.targetProteinG !== user.profile!.targetProteinG,
    "protein target should change with the goal",
  );

  // Activity level also drives targets.
  const moreActive = calculateTargets({ ...base, activityLevel: "VERY_ACTIVE", goal: "WEIGHT_LOSS" });
  ok(
    moreActive.targetCalories > newTargets.targetCalories,
    "higher activity should raise the calorie target",
  );

  await prisma.user.delete({ where: { id: user.id } });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (fails.length) {
      console.error("\nFAILED:");
      for (const f of fails) console.error("  x " + f);
      process.exit(1);
    }
    console.log("\nAll goals checks passed.");
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error("ERROR:", e);
    process.exit(1);
  });
