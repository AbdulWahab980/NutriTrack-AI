import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getToday } from "@/lib/date";
import { AdvicePanel } from "@/components/AdvicePanel";

export const metadata = { title: "AI Coach · NutriTrack AI" };

export default async function CoachPage() {
  const { user } = await requireOnboardedUser();
  const { date } = await getToday();

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId: user.id, logDate: date } },
    include: { _count: { select: { mealEntries: true } } },
  });
  const hasData = (dailyLog?._count.mealEntries ?? 0) > 0;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">AI Coach</h1>
        <p className="mt-1 text-sm text-muted">
          Personalised, budget-aware guidance based only on what you&apos;ve
          logged today — never invented numbers.
        </p>
      </div>
      <AdvicePanel canGenerate={hasData} />
    </div>
  );
}
