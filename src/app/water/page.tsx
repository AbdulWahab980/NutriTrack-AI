import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getToday, getTimeZone } from "@/lib/date";
import { ProgressRing } from "@/components/ProgressRing";
import { WaterQuickAdd } from "@/components/water/WaterQuickAdd";
import { removeWater } from "./actions";

export const metadata = { title: "Water · NutriTrack AI" };

export default async function WaterPage() {
  const { user, profile } = await requireOnboardedUser();
  const tz = await getTimeZone();
  const { date } = await getToday();

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_logDate: { userId: user.id, logDate: date } },
    include: { waterEntries: { orderBy: { loggedAt: "desc" } } },
  });

  const total = dailyLog?.totalWaterMl ?? 0;
  const target = profile.targetWaterMl;
  const remaining = Math.max(0, target - total);
  const entries = dailyLog?.waterEntries ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Water</h1>
        <p className="mt-1 text-sm text-muted">
          Track your intake through the day. Water logged while logging a meal
          counts here too.
        </p>
      </div>

      {/* progress + quick add */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6">
          <ProgressRing
            value={total}
            target={target}
            label="Today"
            unit="ml"
            size={140}
          />
          <p className="mt-3 text-center text-sm text-muted">
            {remaining > 0
              ? `${remaining} ml to go`
              : "Target reached — nice work."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Quick add</h2>
          <div className="mt-3">
            <WaterQuickAdd />
          </div>
        </div>
      </div>

      {/* today's entries */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Today&apos;s log</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nothing logged yet. Use the buttons above to add your first glass.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span aria-hidden>💧</span>
                  {e.amountMl} ml
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {new Intl.DateTimeFormat("en-GB", {
                      hour: "2-digit", minute: "2-digit", timeZone: tz,
                    }).format(e.loggedAt)}
                  </span>
                  <form action={removeWater}>
                    <input type="hidden" name="entryId" value={e.id} />
                    <button
                      type="submit"
                      aria-label="Remove water entry"
                      className="text-xs text-muted hover:text-warning"
                    >
                      Remove
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
