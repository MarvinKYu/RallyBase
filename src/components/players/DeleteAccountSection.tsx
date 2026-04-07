"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/server/actions/player.actions";

export function DeleteAccountSection() {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (result?.error) {
        setError(result.error);
        setConfirmed(false);
      }
    });
  }

  return (
    <div className="mt-10 rounded-md border border-red-900/40 p-4">
      <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
      <p className="mt-1 text-xs text-text-3">
        Permanently delete your account. Your name, email, date of birth, and gender will be
        removed. Your match history will be anonymized and cannot be recovered.
      </p>

      {error && (
        <p className="mt-3 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {!confirmed ? (
        <button
          type="button"
          onClick={() => { setError(null); setConfirmed(true); }}
          className="mt-3 rounded-md border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/40"
        >
          Delete account
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-red-400">
            Are you sure? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Deleting…" : "Yes, permanently delete my account"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmed(false)}
              disabled={isPending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
