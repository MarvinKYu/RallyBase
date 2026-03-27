"use client";

import { useActionState } from "react";
import { tdSubmitResultAction, type MatchActionState } from "@/server/actions/match.actions";

interface GameScore {
  gameNumber: number;
  player1Points: number;
  player2Points: number;
}

interface Props {
  matchId: string;
  tournamentId: string;
  eventId: string;
  format: string;
  redirectTo: string;
  maxGames: number;
  player1Name: string;
  player2Name: string;
  initialScores?: GameScore[];
}

export function TdSubmitResultForm({
  matchId,
  tournamentId,
  eventId,
  format,
  redirectTo,
  maxGames,
  player1Name,
  player2Name,
  initialScores,
}: Props) {
  const boundAction = tdSubmitResultAction.bind(null, matchId, tournamentId, eventId, format, redirectTo);
  const [state, dispatch, isPending] = useActionState<MatchActionState, FormData>(
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

      <div className="rounded-md border border-accent/30 bg-accent/5 px-4 py-2 text-xs text-text-3">
        TD mode — result will be recorded immediately, no confirmation code required.
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-4 border-b border-border-subtle bg-elevated px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-3">
          <span>#</span>
          <span className="truncate">{player1Name}</span>
          <span className="truncate">{player2Name}</span>
        </div>

        {/* Game rows */}
        {Array.from({ length: maxGames }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2rem_1fr_1fr] items-center gap-4 border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
          >
            <span className="text-sm text-text-3">{i + 1}</span>
            <input
              type="number"
              min={0}
              name={`games.${i}.player1Points`}
              defaultValue={initialScores?.[i]?.player1Points ?? 0}
              className="w-full rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="0"
            />
            <input
              type="number"
              min={0}
              name={`games.${i}.player2Points`}
              defaultValue={initialScores?.[i]?.player2Points ?? 0}
              className="w-full rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-text-3">
        Leave unplayed games as 0 – 0. Scores must satisfy first-to-the-point-target, win by 2.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Recording result…" : "Record result (TD)"}
      </button>
    </form>
  );
}
