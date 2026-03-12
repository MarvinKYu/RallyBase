"use client";

import { useActionState } from "react";
import { submitResultAction, type MatchActionState } from "@/server/actions/match.actions";

interface Props {
  matchId: string;
  tournamentId: string;
  eventId: string;
  format: string;
  maxGames: number;
  player1Name: string;
  player2Name: string;
}

export function SubmitResultForm({
  matchId,
  tournamentId,
  eventId,
  format,
  maxGames,
  player1Name,
  player2Name,
}: Props) {
  const boundAction = submitResultAction.bind(null, matchId, tournamentId, eventId, format);
  const [state, dispatch, isPending] = useActionState<MatchActionState, FormData>(
    boundAction,
    null,
  );

  return (
    <form action={dispatch} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <span>#</span>
          <span className="truncate">{player1Name}</span>
          <span className="truncate">{player2Name}</span>
        </div>

        {/* Game rows */}
        {Array.from({ length: maxGames }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2rem_1fr_1fr] items-center gap-4 border-b border-zinc-100 px-4 py-3 last:border-b-0"
          >
            <span className="text-sm text-zinc-400">{i + 1}</span>
            <input
              type="number"
              min={0}
              name={`games.${i}.player1Points`}
              defaultValue={0}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="0"
            />
            <input
              type="number"
              min={0}
              name={`games.${i}.player2Points`}
              defaultValue={0}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400">
        Leave unplayed games as 0 – 0. Scores must satisfy first-to-the-point-target, win by 2.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit result"}
      </button>
    </form>
  );
}
