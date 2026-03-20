"use client";

import { useState } from "react";
import { useActionState } from "react";
import { submitResultAction, saveMatchProgressAction, type MatchActionState } from "@/server/actions/match.actions";

interface Props {
  matchId: string;
  tournamentId: string;
  eventId: string;
  format: string;
  maxGames: number;
  player1Name: string;
  player2Name: string;
  savedScores?: { gameNumber: number; player1Points: number; player2Points: number }[];
}

function parseInvalidGameIndex(error: string | undefined): number | null {
  if (!error) return null;
  const m = error.match(/Game (\d+)/i);
  return m ? parseInt(m[1], 10) - 1 : null;
}

export function SubmitResultForm({
  matchId,
  tournamentId,
  eventId,
  format,
  maxGames,
  player1Name,
  player2Name,
  savedScores,
}: Props) {
  const boundAction = submitResultAction.bind(null, matchId, tournamentId, eventId, format);
  const [state, dispatch, isPending] = useActionState<MatchActionState, FormData>(
    boundAction,
    null,
  );

  const boundSaveAction = saveMatchProgressAction.bind(null, matchId, maxGames);
  const [saveState, saveDispatch, isSaving] = useActionState<MatchActionState, FormData>(
    boundSaveAction,
    null,
  );

  const [scores, setScores] = useState<Array<{ p1: string; p2: string }>>(() => {
    const initial = Array.from({ length: maxGames }, () => ({ p1: "0", p2: "0" }));
    if (savedScores) {
      for (const g of savedScores) {
        const idx = g.gameNumber - 1;
        if (idx >= 0 && idx < maxGames) {
          initial[idx] = { p1: String(g.player1Points), p2: String(g.player2Points) };
        }
      }
    }
    return initial;
  });

  const invalidIndex = parseInvalidGameIndex(state?.error);

  function updateScore(gameIndex: number, player: "p1" | "p2", value: string) {
    setScores((prev) => {
      const next = [...prev];
      next[gameIndex] = { ...next[gameIndex], [player]: value };
      return next;
    });
  }

  function handleFocus(gameIndex: number, player: "p1" | "p2") {
    updateScore(gameIndex, player, "");
  }

  function handleBlur(gameIndex: number, player: "p1" | "p2") {
    setScores((prev) => {
      const next = [...prev];
      if (next[gameIndex][player] === "") {
        next[gameIndex] = { ...next[gameIndex], [player]: "0" };
      }
      return next;
    });
  }

  return (
    <>
    <form action={dispatch} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-4 border-b border-border-subtle bg-elevated px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-3">
          <span>#</span>
          <span className="truncate">{player1Name}</span>
          <span className="truncate">{player2Name}</span>
        </div>

        {/* Game rows */}
        {scores.map((score, i) => {
          const isInvalid = invalidIndex === i;
          return (
            <div
              key={i}
              className={`grid grid-cols-[2rem_1fr_1fr] items-center gap-4 border-b border-border-subtle px-4 py-3 last:border-b-0 ${
                isInvalid ? "bg-red-950/30" : "bg-surface"
              }`}
            >
              <span className="text-sm text-text-3">{i + 1}</span>
              <input
                type="number"
                min={0}
                name={`games.${i}.player1Points`}
                value={score.p1}
                onChange={(e) => updateScore(i, "p1", e.target.value)}
                onFocus={() => handleFocus(i, "p1")}
                onBlur={() => handleBlur(i, "p1")}
                className={`w-full rounded-md border bg-elevated px-3 py-1.5 text-sm text-text-1 shadow-sm focus:outline-none focus:ring-1 ${
                  isInvalid
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border focus:border-accent focus:ring-accent"
                }`}
              />
              <input
                type="number"
                min={0}
                name={`games.${i}.player2Points`}
                value={score.p2}
                onChange={(e) => updateScore(i, "p2", e.target.value)}
                onFocus={() => handleFocus(i, "p2")}
                onBlur={() => handleBlur(i, "p2")}
                className={`w-full rounded-md border bg-elevated px-3 py-1.5 text-sm text-text-1 shadow-sm focus:outline-none focus:ring-1 ${
                  isInvalid
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border focus:border-accent focus:ring-accent"
                }`}
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-3">
        Leave unplayed games as 0 – 0. Scores must satisfy first-to-the-point-target, win by 2.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit result"}
      </button>
    </form>

    <form action={saveDispatch} className="mt-3">
      {scores.map((s, i) => (
        <span key={i}>
          <input type="hidden" name={`games.${i}.player1Points`} value={s.p1} />
          <input type="hidden" name={`games.${i}.player2Points`} value={s.p2} />
        </span>
      ))}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-1 transition-colors hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Save progress"}
      </button>
      {saveState?.success && (
        <p className="mt-2 text-xs text-green-400">Scores saved!</p>
      )}
      {saveState?.error && (
        <p className="mt-2 text-xs text-red-400">{saveState.error}</p>
      )}
    </form>
    </>
  );
}
