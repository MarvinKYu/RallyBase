"use client";

import { useActionState } from "react";
import { type AdminActionState } from "@/server/actions/admin.actions";

interface Props {
  profileId: string;
  currentBirthDate: string;
  action: (prevState: AdminActionState, formData: FormData) => Promise<AdminActionState>;
}

export function AdminDobForm({ currentBirthDate, action }: Props) {
  const [state, dispatch, isPending] = useActionState<AdminActionState, FormData>(action, null);

  return (
    <form action={dispatch} className="rounded-lg border border-border bg-elevated p-4 space-y-3">
      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      <div className="space-y-1">
        <label htmlFor="birthDate" className="block text-sm font-medium text-text-2">
          Date of birth
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={currentBirthDate}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <p className="text-xs text-text-3">Leave blank to clear date of birth.</p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
