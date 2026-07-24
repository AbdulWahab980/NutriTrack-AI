import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getToday, getTimeZone } from "@/lib/date";
import { computeGaps } from "@/lib/insights";
import { getTrendSummary } from "@/lib/trends";
import { TimezoneSync } from "@/components/TimezoneSync";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { MacroDonut } from "@/components/dashboard/MacroDonut";
import { NutritionOverviewChart } from "@/components/dashboard/NutritionOverviewChart";
import { AiInsightCard } from "@/components/dashboard/AiInsightCard";
import { MealsList } from "@/components/dashboard/MealsList";
import {
  UtensilsIcon, DropIcon, AppleIcon, LeafIcon, ScanIcon, PlusIcon, ChatIcon,
} from "@/components/icons";

export const metadata = { title: "Dashboard · NutriTrack AI" };

const pct = (v: number, t: number) => (t > 0 ? Math.min(100, (v / t) * 100) : 0);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export default async function DashboardPage() {
  const { user, profile } = await requireOnboardedUser();
  const tz = await getTimeZone();
  const { date } = await getToday();

  const [dailyLog, week] = await Promise.all([
    prisma.dailyLog.findUnique({
      where: { userId_logDate: { userId: user.id, logDate: date } },
      include: { mealEntries: { orderBy: { loggedAt: "desc" } } },
    }),
    getTrendSummary(user.id, date, 7, profile),
  ]);

  const totals = {
    caloriesKcal: dailyLog?.totalCalories ?? 0,
    proteinG: dailyLog?.totalProteinG ?? 0,
    carbsG: dailyLog?.totalCarbsG ?? 0,
    fatG: dailyLog?.totalFatG ?? 0,
    waterMl: dailyLog?.totalWaterMl ?? 0,
  };
  const hasData = (dailyLog?.mealEntries.length ?? 0) > 0 || totals.waterMl > 0;

  const caloriesRemaining = Math.max(0, profile.targetCalories - totals.caloriesKcal);
  const gaps = hasData ? computeGaps(totals, profile) : [];

  const insight = !hasData
    ? "Log a meal and I'll show exactly where you stand against today's targets."
    : gaps.length > 0
      ? gaps[0].text
      : "You're on track with your calorie, protein and water targets so far today.";

  return (
    <div className="space-y-6">
      <TimezoneSync current={tz} />

      {/* --- stat cards --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Calories Remaining"
          value={fmt(caloriesRemaining)} unit="kcal"
          sub={`of ${fmt(profile.targetCalories)} kcal`}
          percent={pct(totals.caloriesKcal, profile.targetCalories)}
          over={totals.caloriesKcal > profile.targetCalories}
          icon={<UtensilsIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Protein"
          value={fmt(totals.proteinG)} unit="g"
          sub={`of ${fmt(profile.targetProteinG)} g`}
          percent={pct(totals.proteinG, profile.targetProteinG)}
          icon={<LeafIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Water"
          value={(totals.waterMl / 1000).toFixed(1)} unit="L"
          sub={`of ${(profile.targetWaterMl / 1000).toFixed(1)} L`}
          percent={pct(totals.waterMl, profile.targetWaterMl)}
          icon={<DropIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Carbs"
          value={fmt(totals.carbsG)} unit="g"
          sub={`of ${fmt(profile.targetCarbsG)} g`}
          percent={pct(totals.carbsG, profile.targetCarbsG)}
          icon={<AppleIcon className="h-5 w-5" />}
        />
      </div>

      {/* --- quick actions --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickActionCard href="/log" title="Scan Meal" subtitle="Log your meal" icon={<ScanIcon className="h-5 w-5" />} />
        <QuickActionCard href="/log" title="Add Food" subtitle="Log your food manually" icon={<PlusIcon className="h-5 w-5" />} />
        <QuickActionCard href="/coach" title="Ask AI Coach" subtitle="Get personalized advice" icon={<ChatIcon className="h-5 w-5" />} />
        <QuickActionCard href="/log" title="Log Water" subtitle="Track your water intake" icon={<DropIcon className="h-5 w-5" />} />
      </div>

      {/* --- charts --- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <NutritionOverviewChart days={week.days} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Macronutrient Balance</h2>
          <p className="text-xs text-muted">Today</p>
          <div className="mt-6">
            <MacroDonut proteinG={totals.proteinG} carbsG={totals.carbsG} fatG={totals.fatG} />
          </div>
        </div>
      </div>

      {/* --- insight + meals --- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AiInsightCard text={insight} />
        <MealsList entries={dailyLog?.mealEntries ?? []} timeZone={tz} />
      </div>
    </div>
  );
}
