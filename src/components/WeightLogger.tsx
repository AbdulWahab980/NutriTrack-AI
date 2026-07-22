"use client";

import { useActionState } from "react";
import { logWeight, type WeightState } from "@/app/trends/actions";

export function WeightLogger({ current }: { current: number | null }) {
  const [state, action, pending] = useActionState<WeightState, FormData>(
    logWeight,
    {},
  );

  return (
    <form action={action} className="mt-3 flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="weightKg" className="block text-xs text-muted">
          Today&apos;s weight (kg)
        </label>
        <input
          id="weightKg"
          name="weightKg"
          type="number"
          step="0.1"
          min={20}
          max={400}
          required
          defaultValue={current ?? ""}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : state.ok ? "Saved" : "Save"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-warning">
          {state.error}
        </p>
      )}
    </form>
  );
}
