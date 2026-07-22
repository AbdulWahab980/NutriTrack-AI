"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type SettingsState } from "@/app/settings/actions";

/**
 * Irreversible, so the button stays disabled until the user types their exact
 * email address. No confirm dialog — a typed confirmation is harder to do by
 * accident and survives misclicks.
 */
export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    deleteAccount,
    {},
  );
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <div className="rounded-xl border border-warning/40 p-5">
      <h2 className="text-sm font-semibold text-warning">Delete my data</h2>
      <p className="mt-1 text-sm text-muted">
        Permanently deletes your account, profile, every meal and water entry,
        your weight history, and all generated guidance. This cannot be undone
        and there is no backup.
      </p>

      <form action={action} className="mt-4 space-y-3">
        <div>
          <label htmlFor="confirmEmail" className="block text-xs text-muted">
            Type <span className="font-medium text-foreground">{email}</span> to confirm
          </label>
          <input
            id="confirmEmail"
            name="confirmEmail"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-warning"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-warning">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!matches || pending}
          className="w-full rounded-lg bg-warning px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Permanently delete my account"}
        </button>
      </form>
    </div>
  );
}
