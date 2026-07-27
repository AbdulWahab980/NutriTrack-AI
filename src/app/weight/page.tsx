import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { WeightForm } from "@/components/weight/WeightForm";
import { WeightChart } from "@/components/weight/WeightChart";
import { removeWeight } from "./actions";

export const metadata = { title: "Weight · NutriTrack AI" };

function isoOf(d: Date) {
  return d.toISOString().slice(0, 10);
}
function label(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", timeZone: "UTC",
  }).format(d);
}

export default async function WeightPage() {
  const { user, profile } = await requireOnboardedUser();

  const entries = await prisma.weightEntry.findMany({
    where: { userId: user.id },
    orderBy: { logDate: "asc" },
  });

  const latest = entries.length ? entries[entries.length - 1] : null;
  const first = entries.length ? entries[0] : null;
  const change =
    latest && first && entries.length > 1
      ? Math.round((latest.weightKg - first.weightKg) * 10) / 10
      : null;

  const chartPoints = entries.map((e) => ({
    label: label(e.logDate),
    weightKg: e.weightKg,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Weight</h1>
        <p className="mt-1 text-sm text-muted">
          Log your weight over time. This is separate from your profile —
          logging here tracks history and doesn&apos;t change your targets.
        </p>
      </div>

      {/* summary + form */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted">Latest weight</p>
          <p className="mt-1 text-3xl font-bold">
            {latest ? latest.weightKg : profile.weightKg}
            <span className="ml-1 text-base font-medium text-muted">kg</span>
          </p>
          {change !== null && (
            <p className={`mt-1 text-xs ${change <= 0 ? "text-primary" : "text-muted"}`}>
              {change > 0 ? "+" : ""}{change} kg since {label(first!.logDate)}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Log a weight</h2>
          <div className="mt-3">
            <WeightForm latest={latest?.weightKg ?? profile.weightKg} />
          </div>
        </div>
      </div>

      {/* trend */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Trend</h2>
        <div className="mt-3">
          <WeightChart points={chartPoints} />
        </div>
      </div>

      {/* history */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">History</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No weigh-ins logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium">{e.weightKg} kg</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted">{label(e.logDate)}</span>
                  <form action={removeWeight}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      aria-label={`Remove weigh-in from ${label(e.logDate)}`}
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
