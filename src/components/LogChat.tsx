"use client";

import { useActionState, useEffect, useState } from "react";
import { analyzeMessage, confirmDraft, type LogState } from "@/app/log/actions";
import { SupportCard } from "./SupportCard";

const EXAMPLES = [
  "2 parathas and a cup of tea for breakfast",
  "daal chawal for lunch and 1.5 litres of water",
  "2 boiled eggs and a banana as a snack",
];

export function LogChat() {
  const [analyzeState, analyze, analyzing] = useActionState<LogState, FormData>(
    analyzeMessage,
    {},
  );
  const [confirmState, confirm, confirming] = useActionState<LogState, FormData>(
    confirmDraft,
    {},
  );

  // The browser knows the user's real local date; the server would only see UTC.
  const [logDate, setLogDate] = useState("");
  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setLogDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, []);

  const draft = analyzeState.draft;
  const justSaved = confirmState.saved;

  // Safety screen tripped — nothing else renders this turn.
  if (analyzeState.support) {
    return <SupportCard />;
  }

  if (justSaved) {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-lg font-semibold text-primary">Logged.</p>
        <p className="mt-1 text-sm text-muted">
          Today&apos;s running total: {Math.round(justSaved.calories)} kcal
          {justSaved.waterMl > 0 && <> · {justSaved.waterMl} ml water</>}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Log something else
        </button>
      </div>
    );
  }

  // --- Step 2: confirm-back ---
  if (draft) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold">Here&apos;s what I got</h2>
          <p className="mt-1 text-xs text-muted">
            Check this over before I log it.
          </p>

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
                            <span className="ml-1.5 text-xs text-warning">
                              (assumed)
                            </span>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Water
                </p>
                <p className="mt-1.5 text-sm">{draft.waterMl} ml</p>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-border pt-3 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">
                {Math.round(draft.totals.caloriesKcal)} kcal
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {Math.round(draft.totals.proteinG)}g protein ·{" "}
              {Math.round(draft.totals.carbsG)}g carbs ·{" "}
              {Math.round(draft.totals.fatG)}g fat
            </p>
          </div>

          {draft.unmatchedNames.length > 0 && (
            <p className="mt-3 rounded-lg bg-surface p-3 text-xs text-muted">
              I couldn&apos;t find nutrition data for{" "}
              <strong>{draft.unmatchedNames.join(", ")}</strong>, so it&apos;s
              excluded from the total rather than guessed. It&apos;ll still be
              saved so you can fill it in later.
            </p>
          )}

          {draft.clarifications.length > 0 && (
            <div className="mt-3 rounded-lg bg-surface p-3">
              <p className="text-xs font-medium text-primary">
                To make this more accurate:
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-muted">
                {draft.clarifications.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {confirmState.error && (
          <p role="alert" className="text-sm text-warning">
            {confirmState.error}
          </p>
        )}

        <div className="flex gap-3">
          <form action={confirm} className="flex-1">
            <input type="hidden" name="draft" value={JSON.stringify(draft)} />
            <input type="hidden" name="message" value={analyzeState.message ?? ""} />
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
            onClick={() => window.location.reload()}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted"
          >
            Redo
          </button>
        </div>
      </div>
    );
  }

  // --- Step 1: describe ---
  return (
    <form action={analyze} className="space-y-4">
      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          What did you eat or drink?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          defaultValue={analyzeState.message ?? ""}
          placeholder="e.g. I had 2 parathas and a cup of tea for breakfast, daal chawal for lunch, and about 1.5 litres of water"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="mt-1 text-xs text-muted">
          Plain language is fine — no need to weigh anything.
        </p>
      </div>

      {analyzeState.error && (
        <p role="alert" className="text-sm text-warning">
          {analyzeState.error}
        </p>
      )}

      <button
        type="submit"
        disabled={analyzing}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {analyzing ? "Reading that…" : "Continue"}
      </button>

      <div>
        <p className="text-xs text-muted">Try:</p>
        <ul className="mt-1 space-y-1">
          {EXAMPLES.map((ex) => (
            <li key={ex} className="text-xs text-muted">
              &ldquo;{ex}&rdquo;
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
