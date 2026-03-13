"use client";

import { useActionState } from "react";
import {
  createEventAction,
  type TournamentActionState,
} from "@/server/actions/tournament.actions";

type RatingCategory = { id: string; name: string };

export function EventForm({
  tournamentId,
  ratingCategories,
}: {
  tournamentId: string;
  ratingCategories: RatingCategory[];
}) {
  const boundAction = createEventAction.bind(null, tournamentId);
  const [state, dispatch, isPending] = useActionState<TournamentActionState, FormData>(
    boundAction,
    null,
  );

  return (
    <form action={dispatch} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="ratingCategoryId" className="block text-sm font-medium text-text-2">
          Rating category <span className="text-red-400">*</span>
        </label>
        <select
          id="ratingCategoryId"
          name="ratingCategoryId"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Select a rating category…</option>
          {ratingCategories.map((rc) => (
            <option key={rc.id} value={rc.id}>
              {rc.name}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.ratingCategoryId && (
          <p className="text-sm text-red-400">{state.fieldErrors.ratingCategoryId[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-text-2">
          Event name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. U1800 Singles"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="format" className="block text-sm font-medium text-text-2">
            Match format
          </label>
          <select
            id="format"
            name="format"
            defaultValue="BEST_OF_5"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="BEST_OF_3">Best of 3</option>
            <option value="BEST_OF_5">Best of 5</option>
            <option value="BEST_OF_7">Best of 7</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="gamePointTarget" className="block text-sm font-medium text-text-2">
            Points per game
          </label>
          <select
            id="gamePointTarget"
            name="gamePointTarget"
            defaultValue="11"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="11">First to 11</option>
            <option value="21">First to 21</option>
          </select>
          {state?.fieldErrors?.gamePointTarget && (
            <p className="text-sm text-red-400">{state.fieldErrors.gamePointTarget[0]}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating event…" : "Create event"}
      </button>
    </form>
  );
}
