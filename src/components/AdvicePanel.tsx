"use client";

import { useActionState } from "react";
import { requestAdvice, rateAdvice, type AdviceState } from "@/app/today/actions";
import { SupportCard } from "./SupportCard";

export function AdvicePanel({ canGenerate }: { canGenerate: boolean }) {
  const [state, action, pending] = useActionState<AdviceState, FormData>(
    requestAdvice,
    {},
  );

  if (state.support) {
    return <SupportCard />;
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold">Today&apos;s guidance</h2>

      {state.text ? (
        <>
          <p className="mt-2 whitespace-pre-line text-sm text-foreground">
            {state.text}
          </p>
          {state.feedbackId && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-muted">Was this useful?</span>
              {[
                [1, "Yes"],
                [-1, "No"],
              ].map(([rating, label]) => (
                <form key={String(rating)} action={rateAdvice}>
                  <input type="hidden" name="feedbackId" value={state.feedbackId} />
                  <input type="hidden" name="rating" value={String(rating)} />
                  <button
                    type="submit"
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted hover:border-primary hover:text-primary"
                  >
                    {label}
                  </button>
                </form>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Based only on the numbers logged above — general nutrition guidance,
            not medical advice.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            {canGenerate
              ? "Specific, budget-aware suggestions based on what you've logged today."
              : "Log a meal first and I'll have numbers to work with."}
          </p>
          {state.error && (
            <p role="alert" className="mt-2 text-sm text-warning">
              {state.error}
            </p>
          )}
          <form action={action} className="mt-3">
            <button
              type="submit"
              disabled={pending || !canGenerate}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {pending ? "Thinking…" : "Get today's guidance"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
