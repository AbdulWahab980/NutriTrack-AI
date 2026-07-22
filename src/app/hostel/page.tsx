import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { getToday } from "@/lib/date";
import { getWeeklyBudget } from "@/lib/hostel/budget";
import { HostelSuggestPanel } from "@/components/HostelSuggestPanel";
import { addMessItem, deleteMessItem } from "./actions";

export const metadata = { title: "Hostel mode · NutriTrack AI" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MEALS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export default async function HostelPage() {
  const { user, profile } = await requireOnboardedUser();
  if (profile.livingSituation !== "HOSTEL") {
    redirect("/today");
  }

  const { date } = await getToday();
  const todayDow = date.getUTCDay();

  const [messItems, budget] = await Promise.all([
    prisma.hostelMessItem.findMany({
      where: { userId: user.id },
      orderBy: [{ dayOfWeek: "asc" }, { mealType: "asc" }],
    }),
    getWeeklyBudget(user.id, date, profile.dailyFoodBudgetPkr),
  ]);

  // Pre-fill the suggestion box with anything saved for today.
  const todaysMenu = messItems
    .filter((m) => m.dayOfWeek === null || m.dayOfWeek === todayDow)
    .map((m) => `${m.mealType.toLowerCase()}: ${m.description}`)
    .join("; ");

  const maxSpend = Math.max(...budget.days.map((d) => d.spentPkr), 1);
  const overBudget =
    budget.weeklyBudgetPkr !== null && budget.totalPkr > budget.weeklyBudgetPkr;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hostel mode</h1>
        <p className="mt-1 text-sm text-muted">
          Budget-aware suggestions built around your mess and kitchen access.
        </p>
      </div>

      <HostelSuggestPanel defaultMenu={todaysMenu} />

      {/* --- weekly budget --- */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">This week&apos;s food spend</h2>
          <span
            className={`text-sm font-semibold ${overBudget ? "text-warning" : "text-primary"}`}
          >
            {budget.totalPkr} PKR
            {budget.weeklyBudgetPkr !== null && (
              <span className="font-normal text-muted"> / {budget.weeklyBudgetPkr}</span>
            )}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-1.5" aria-hidden>
          {budget.days.map((d) => (
            <div key={d.iso} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${overBudget ? "bg-warning" : "bg-primary"}`}
                style={{ height: `${Math.max(2, (d.spentPkr / maxSpend) * 64)}px` }}
              />
              <span className="text-[10px] text-muted">
                {DAYS[new Date(d.iso + "T00:00:00Z").getUTCDay()][0]}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">
          {budget.daysLogged === 0
            ? "No spend recorded yet — log some meals and this fills in."
            : `Based on ${budget.daysLogged} day${budget.daysLogged === 1 ? "" : "s"} of logs.`}
          {budget.unpricedItems > 0 && (
            <> {budget.unpricedItems} logged item(s) have no known price, so they&apos;re not counted.</>
          )}
        </p>
      </div>

      {/* --- saved mess menu --- */}
      <div className="rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Your mess menu</h2>
        <p className="mt-1 text-xs text-muted">
          Save what&apos;s usually served so you don&apos;t retype it each day.
        </p>

        {messItems.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {messItems.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 text-sm">
                  <span className="text-xs text-muted">
                    {m.dayOfWeek === null ? "Any day" : DAYS[m.dayOfWeek]} ·{" "}
                    {m.mealType.toLowerCase()}
                  </span>
                  <span className="block truncate">{m.description}</span>
                </span>
                <form action={deleteMessItem}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-muted hover:text-warning"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addMessItem} className="mt-4 space-y-3">
          <input
            name="description"
            required
            minLength={2}
            maxLength={300}
            placeholder="e.g. Daal chawal + salad"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              name="mealType"
              defaultValue="DINNER"
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              name="dayOfWeek"
              defaultValue="any"
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="any">Any day</option>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium"
          >
            Add to menu
          </button>
        </form>
      </div>
    </section>
  );
}
