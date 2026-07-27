import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getToday } from "@/lib/date";
import { percentOf } from "@/lib/insights";
import { GoalEditor } from "@/components/goals/GoalEditor";

export const metadata = { title: "Goals · NutriTrack AI" };

const GOAL_LABEL: Record<string, string> = {
  WEIGHT_LOSS: "Weight loss",
  MUSCLE_GAIN: "Muscle gain",
  MAINTENANCE: "Maintenance",
  GENERAL_HEALTH: "General health",
};

export default async function GoalsPage() {
  const { user, profile } = await requireOnboardedUser();
  const { date } = await getToday();

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId: user.id, logDate: date } },
  });

  const rows: [string, number, number, string][] = [
    ["Calories", dailyLog?.totalCalories ?? 0, profile.targetCalories, "kcal"],
    ["Protein", dailyLog?.totalProteinG ?? 0, profile.targetProteinG, "g"],
    ["Carbs", dailyLog?.totalCarbsG ?? 0, profile.targetCarbsG, "g"],
    ["Fat", dailyLog?.totalFatG ?? 0, profile.targetFatG, "g"],
    ["Water", dailyLog?.totalWaterMl ?? 0, profile.targetWaterMl, "ml"],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="mt-1 text-sm text-muted">
          Your current goal is{" "}
          <span className="font-medium text-primary">
            {GOAL_LABEL[profile.goal] ?? profile.goal}
          </span>
          . Targets are calculated from it — change the goal below to recalculate.
        </p>
      </div>

      {/* targets + today's progress */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Daily targets & today&apos;s progress</h2>
          <span className="text-xs text-muted">
            BMR {Math.round(profile.bmrKcal)} · TDEE {Math.round(profile.tdeeKcal)} kcal
          </span>
        </div>

        <ul className="mt-4 space-y-4">
          {rows.map(([label, value, target, unit]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-muted">
                  <span className="font-semibold text-foreground">{Math.round(value)}</span>
                  {" / "}{Math.round(target)} {unit}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-track">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${percentOf(value, target)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* edit goal */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Change your goal</h2>
        <div className="mt-4">
          <GoalEditor goal={profile.goal} activityLevel={profile.activityLevel} />
        </div>
      </div>

      <p className="text-xs text-muted">
        Editing your height, age, weight, gender, or living situation is on the{" "}
        <a href="/profile" className="font-medium text-primary">Profile</a> screen.
      </p>
    </div>
  );
}
