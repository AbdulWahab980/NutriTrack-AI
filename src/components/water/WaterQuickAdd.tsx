"use client";

import { useActionState, useRef } from "react";
import { addWater, type WaterState } from "@/app/water/actions";

const PRESETS = [250, 500, 750];

export function WaterQuickAdd() {
  const [state, action, pending] = useActionState<WaterState, FormData>(
    addWater,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      {/* preset buttons */}
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((ml) => (
          <form key={ml} action={action}>
            <input type="hidden" name="amountMl" value={ml} />
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold text-primary transition-colors hover:border-primary/40 disabled:opacity-60"
            >
              +{ml} ml
            </button>
          </form>
        ))}
      </div>

      {/* custom amount */}
      <form ref={formRef} action={action} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="amountMl" className="block text-xs text-muted">
            Custom amount (ml)
          </label>
          <input
            id="amountMl"
            name="amountMl"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            placeholder="e.g. 300"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-warning">
          {state.error}
        </p>
      )}
    </div>
  );
}
