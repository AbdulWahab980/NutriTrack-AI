"use client";

import { useActionState } from "react";
import { analyzeMessage, type LogState } from "@/app/log/actions";
import { SupportCard } from "./SupportCard";
import { DraftReview } from "./log/DraftReview";

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

  const draft = analyzeState.draft;

  // Safety screen tripped — nothing else renders this turn.
  if (analyzeState.support) {
    return <SupportCard />;
  }

  // --- Step 2: confirm-back ---
  if (draft) {
    return (
      <DraftReview
        draft={draft}
        message={analyzeState.message ?? ""}
        onRedo={() => window.location.reload()}
      />
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
