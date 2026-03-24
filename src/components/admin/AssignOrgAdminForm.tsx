"use client";

import { useActionState } from "react";
import { type AdminActionState } from "@/server/actions/admin.actions";

export function AssignOrgAdminForm({
  organizationId,
  action,
}: {
  organizationId: string;
  action: (prevState: AdminActionState, formData: FormData) => Promise<AdminActionState>;
}) {
  const [state, dispatch, isPending] = useActionState<AdminActionState, FormData>(action, null);

  return (
    <form action={dispatch} className="flex items-end gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="space-y-1">
        <label htmlFor={`playerNumber-${organizationId}`} className="block text-xs font-medium text-text-3">
          Assign by player #
        </label>
        <input
          id={`playerNumber-${organizationId}`}
          name="playerNumber"
          type="number"
          min="1"
          placeholder="e.g. 2"
          className="w-32 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:opacity-50"
      >
        {isPending ? "Assigning…" : "Assign"}
      </button>
      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
    </form>
  );
}
