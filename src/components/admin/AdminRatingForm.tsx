"use client";

import { useActionState } from "react";
import { type AdminActionState } from "@/server/actions/admin.actions";

export function AdminRatingForm({
  profileId,
  ratingCategoryId,
  currentRating,
  action,
}: {
  profileId: string;
  ratingCategoryId: string;
  currentRating: number;
  action: (prevState: AdminActionState, formData: FormData) => Promise<AdminActionState>;
}) {
  const [state, dispatch, isPending] = useActionState<AdminActionState, FormData>(action, null);

  return (
    <form action={dispatch} className="flex items-end gap-2">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="ratingCategoryId" value={ratingCategoryId} />
      <div className="space-y-1">
        <label className="block text-xs font-medium text-text-3">Set rating</label>
        <input
          name="rating"
          type="number"
          min="0"
          step="1"
          defaultValue={Math.round(currentRating)}
          className="w-28 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Set"}
      </button>
      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
    </form>
  );
}
