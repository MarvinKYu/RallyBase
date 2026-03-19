"use client";

import { useState } from "react";
import Link from "next/link";
import { tdVoidMatchAction } from "@/server/actions/match.actions";

type GameScore = {
  gameNumber: number;
  player1Points: number;
  player2Points: number;
};

export type MatchRow = {
  id: string;
  round: number;
  status: "PENDING" | "IN_PROGRESS" | "AWAITING_CONFIRMATION" | "COMPLETED";
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  player1: { id: string; displayName: string } | null;
  player2: { id: string; displayName: string } | null;
  matchGames: GameScore[];
};

const STATUS_LABEL: Record<MatchRow["status"], string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  COMPLETED: "Completed",
};

export function ManageEventMatchList({
  matches,
  tournamentId,
  eventId,
}: {
  matches: MatchRow[];
  tournamentId: string;
  eventId: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Group by round
  const roundMap = new Map<number, MatchRow[]>();
  for (const m of matches) {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
  }
  const rounds = [...roundMap.keys()].sort((a, b) => a - b);

  if (matches.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-text-2">No bracket generated yet.</p>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {rounds.map((round) => (
        <div key={round}>
          <p className="sticky top-0 bg-elevated px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-3">
            Round {round}
          </p>
          {roundMap.get(round)!.map((match) => {
            const isBye = match.player2Id === null && match.status === "COMPLETED";
            const isExpanded = expanded.has(match.id);
            const hasScores = match.matchGames.length > 0;

            return (
              <div key={match.id} className="border-t border-border-subtle first:border-t-0">
                {/* Match row */}
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm text-text-1">
                      {match.player1?.displayName ?? "TBD"} vs.{" "}
                      {match.player2?.displayName ?? (isBye ? "BYE" : "TBD")}
                    </p>
                    {/* Inline score summary when collapsed */}
                    {!isExpanded && hasScores && (
                      <p className="text-xs text-text-3">
                        {match.matchGames
                          .map((g) => `${g.player1Points}–${g.player2Points}`)
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {match.status === "PENDING" ? (
                      <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-3">
                        {STATUS_LABEL[match.status]}
                      </span>
                    ) : (
                      <span
                        className={`text-xs ${
                          match.status === "COMPLETED"
                            ? "text-text-3"
                            : "text-amber-400"
                        }`}
                      >
                        {STATUS_LABEL[match.status]}
                      </span>
                    )}

                    {/* Enter result */}
                    {(match.status === "PENDING" || match.status === "AWAITING_CONFIRMATION") &&
                      match.player1Id &&
                      match.player2Id && (
                        <Link
                          href={`/matches/${match.id}/td-submit`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Enter result
                        </Link>
                      )}

                    {/* Void */}
                    {(match.status === "COMPLETED" || match.status === "AWAITING_CONFIRMATION") &&
                      !isBye && (
                        <form
                          action={tdVoidMatchAction.bind(null, match.id, tournamentId, eventId)}
                        >
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-400 hover:underline"
                          >
                            Void
                          </button>
                        </form>
                      )}

                    {/* Expand/collapse toggle for completed matches with scores */}
                    {match.status === "COMPLETED" && hasScores && (
                      <button
                        onClick={() => toggle(match.id)}
                        className="text-xs text-text-3 transition-colors hover:text-text-1"
                        aria-label={isExpanded ? "Collapse scores" : "Expand scores"}
                      >
                        {isExpanded ? "▴" : "▾"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded game scores */}
                {isExpanded && hasScores && (
                  <div className="border-t border-border-subtle bg-elevated px-4 pb-3 pt-2">
                    <div className="space-y-1">
                      {match.matchGames.map((g) => (
                        <div key={g.gameNumber} className="flex items-center gap-3 text-xs">
                          <span className="w-12 text-text-3">Game {g.gameNumber}</span>
                          <span
                            className={
                              g.player1Points > g.player2Points
                                ? "font-medium text-text-1"
                                : "text-text-2"
                            }
                          >
                            {g.player1Points}
                          </span>
                          <span className="text-text-3">–</span>
                          <span
                            className={
                              g.player2Points > g.player1Points
                                ? "font-medium text-text-1"
                                : "text-text-2"
                            }
                          >
                            {g.player2Points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
