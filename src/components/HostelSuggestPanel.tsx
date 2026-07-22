"use client";

import { useActionState } from "react";
import { suggestAddOns, type HostelState } from "@/app/hostel/actions";
import { SupportCard } from "./SupportCard";

export function HostelSuggestPanel({ defaultMenu }: { defaultMenu: string }) {
  const [state, action, pending] = useActionState<HostelState, FormData>(
    suggestAddOns,
    {},
  );

  if (state.support) return <SupportCard />;

  return (
    <div className="rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold">What&apos;s the mess serving today?</h2>
      <p className="mt-1 text-xs text-muted">
        I&apos;ll suggest add-ons that fit your budget and what you can actually
        cook — using real prices, not estimates.
      </p>

      <form action={action} className="mt-3 space-y-3">
        <textarea
          name="messDescription"
          rows={2}
          maxLength={500}
          defaultValue={defaultMenu}
          placeholder="e.g. daal and roti tonight, salad on the side"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Thinking…" : "Suggest add-ons"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="mt-3 text-sm text-warning">
          {state.error}
        </p>
      )}

      {state.text && (
        <div className="mt-4 rounded-lg bg-surface p-4">
          <p className="whitespace-pre-line text-sm">{state.text}</p>
        </div>
      )}
    </div>
  );
}
