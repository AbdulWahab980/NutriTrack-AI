import Link from "next/link";
import { removeEntry } from "@/app/log/actions";

type Entry = {
  id: string;
  foodName: string;
  mealType: string;
  quantity: number;
  unit: string;
  caloriesKcal: number;
  proteinG: number;
  needsManualEntry: boolean;
  loggedAt: Date;
};

const EMOJI: Record<string, string> = {
  BREAKFAST: "🥣", LUNCH: "🍚", DINNER: "🍽️", SNACK: "🍎",
};

export function MealsList({ entries, timeZone }: { entries: Entry[]; timeZone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Today&apos;s Meals</h2>
        <Link href="/log" className="text-sm font-medium text-primary">
          View All
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted">Nothing logged yet today.</p>
          <Link
            href="/log"
            className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Log a meal
          </Link>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-lg">
                {EMOJI[e.mealType] ?? "🍽️"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize">{e.foodName}</p>
                <p className="text-xs text-muted">
                  <span className="capitalize">{e.mealType.toLowerCase()}</span>
                  {" · "}
                  {new Intl.DateTimeFormat("en-GB", {
                    hour: "2-digit", minute: "2-digit", timeZone,
                  }).format(e.loggedAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">
                  {e.needsManualEntry ? "—" : `${Math.round(e.caloriesKcal)} kcal`}
                </p>
                <p className="text-xs text-muted">{Math.round(e.proteinG)}g Protein</p>
              </div>
              <form action={removeEntry}>
                <input type="hidden" name="entryId" value={e.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${e.foodName}`}
                  className="ml-1 rounded-md px-1.5 text-muted hover:text-warning"
                >
                  ⋮
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
