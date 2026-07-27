"use client";

import { useActionState, useEffect, useState } from "react";
import { confirmDraft, type LogState } from "@/app/log/actions";
import type { LogDraft } from "@/lib/log/draft";

/**
 * Confirm-back step shared by the chat flow and the photo-scan flow, so both
 * price and confirm food identically before saving (spec §3.2).
 */
export function DraftReview({
  draft,
  message,
  onRedo,
}: {
  draft: LogDraft;
  message: string;
  onRedo: () => void;
}) {
  const [state, confirm, confirming] = useActionState<LogState, FormData>(
    confirmDraft,
    {},
  );

  // The browser knows the user's real local date; the server only sees UTC.
  const [logDate, setLogDate] = useState("");
  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setLogDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, []);

  if (state.saved) {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-lg font-semibold text-primary">Logged.</p>
        <p className="mt-1 text-sm text-muted">
          Today&apos;s running total: {Math.round(state.saved.calories)} kcal
          {state.saved.waterMl > 0 && <> · {state.saved.waterMl} ml water</>}
        </p>
        <button
          onClick={onRedo}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Log something else
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Here&apos;s what I got</h2>
        <p className="mt-1 text-xs text-muted">Check this over before I log it.</p>

        <div className="mt-4 space-y-4">
          {draft.meals
            .filter((m) => m.items.length > 0)
            .map((meal) => (
              <div key={meal.mealType}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {meal.mealType}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {meal.items.map((item, i) => (
                    <li
                      key={`${meal.mealType}-${i}`}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span>
                        {item.quantity} {item.unit} {item.name}
                        {item.confidence === "low" && (
                          <span className="ml-1.5 text-xs text-warning">(assumed)</span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium">
                        {item.matched ? (
                          `${Math.round(item.caloriesKcal)} kcal`
                        ) : (
                          <span className="text-warning">not found</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          {draft.waterMl > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Water</p>
              <p className="mt-1.5 text-sm">{draft.waterMl} ml</p>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-3 text-sm">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">{Math.round(draft.totals.caloriesKcal)} kcal</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {Math.round(draft.totals.proteinG)}g protein ·{" "}
            {Math.round(draft.totals.carbsG)}g carbs · {Math.round(draft.totals.fatG)}g fat
          </p>
        </div>

        {draft.unmatchedNames.length > 0 && (
          <p className="mt-3 rounded-lg bg-surface p-3 text-xs text-muted">
            I couldn&apos;t find nutrition data for{" "}
            <strong>{draft.unmatchedNames.join(", ")}</strong>, so it&apos;s excluded
            from the total rather than guessed. It&apos;ll still be saved so you can
            fill it in later.
          </p>
        )}

        {draft.clarifications.length > 0 && (
          <div className="mt-3 rounded-lg bg-surface p-3">
            <p className="text-xs font-medium text-primary">To make this more accurate:</p>
            <ul className="mt-1 list-inside list-disc text-xs text-muted">
              {draft.clarifications.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-warning">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <form action={confirm} className="flex-1">
          <input type="hidden" name="draft" value={JSON.stringify(draft)} />
          <input type="hidden" name="message" value={message} />
          <input type="hidden" name="logDate" value={logDate} />
          <button
            type="submit"
            disabled={confirming || !logDate}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {confirming ? "Saving…" : "Looks right, log it"}
          </button>
        </form>
        <button
          onClick={onRedo}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted"
        >
          Redo
        </button>
      </div>
    </div>
  );
}
