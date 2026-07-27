"use client";

import { useActionState, useEffect, useState } from "react";
import { logWeight, type WeightState } from "@/app/weight/actions";

export function WeightForm({ latest }: { latest: number | null }) {
  const [state, action, pending] = useActionState<WeightState, FormData>(
    logWeight,
    {},
  );

  // Default the date to the user's local today, and cap it there.
  const [today, setToday] = useState("");
  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setToday(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, []);

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="weightKg" className="block text-xs text-muted">
            Weight (kg)
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            min={20}
            max={400}
            required
            defaultValue={latest ?? ""}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="logDate" className="block text-xs text-muted">
            Date
          </label>
          <input
            id="logDate"
            name="logDate"
            type="date"
            required
            defaultValue={today}
            max={today}
            key={today} /* re-mount once `today` resolves so defaultValue applies */
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-warning">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !today}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Saving…" : state.ok ? "Saved ✓" : "Log weight"}
      </button>
    </form>
  );
}
