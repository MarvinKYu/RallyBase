"use client";

import { useActionState } from "react";
import { type AdminActionState } from "@/server/actions/admin.actions";

export function AdminRatingForm({
  profileId,
  ratingCategoryId,
  orgName,
  categoryName,
  currentRating,
  gamesPlayed,
  action,
}: {
  profileId: string;
  ratingCategoryId: string;
  orgName: string;
  categoryName: string;
  currentRating: number;
  gamesPlayed: number;
  action: (prevState: AdminActionState, formData: FormData) => Promise<AdminActionState>;
}) {
  const [state, dispatch, isPending] = useActionState<AdminActionState, FormData>(action, null);

  return (
    <form action={dispatch} className="flex items-start justify-between gap-4">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="ratingCategoryId" value={ratingCategoryId} />

      {/* Left column: identity + current rating */}
      <div>
        <p className="text-xs text-text-3">{orgName}</p>
        <p className="text-sm font-medium text-text-1">{categoryName}</p>
        <p className="text-2xl font-semibold text-text-1 mt-2">{Math.round(currentRating)}</p>
        <p className="text-xs text-text-3">{gamesPlayed} games played</p>
      </div>

      {/* Right column: set rating control */}
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs font-medium text-text-3">Set Rating</p>
        <div className="flex items-center gap-2">
          <input
            name="rating"
            type="number"
            min="0"
            step="1"
            defaultValue={Math.round(currentRating)}
            className="w-28 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Set"}
          </button>
        </div>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      </div>
    </form>
  );
}
