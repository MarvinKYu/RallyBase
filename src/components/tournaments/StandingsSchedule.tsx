"use client";

import { useState } from "react";
import Link from "next/link";
import { tdVoidMatchAction } from "@/server/actions/match.actions";

export type SerializedMatch = {
  id: string;
  round: number;
  status: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  isDefault?: boolean;
  player1: { id: string; displayName: string } | null;
  player2: { id: string; displayName: string } | null;
  matchGames: { gameNumber: number; player1Points: number; player2Points: number }[];
};

export function StandingsSchedule({
  rounds,
  isTD,
  tournamentId,
  eventId,
  voidReturnTo,
  compact = false,
  viewerProfileId = null,
}: {
  rounds: Array<{ round: number; matches: SerializedMatch[] }>;
  isTD: boolean;
  tournamentId: string;
  eventId: string;
  voidReturnTo: string;
  compact?: boolean;
  viewerProfileId?: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className={compact ? "space-y-2" : "space-y-6"}>
      {rounds.map(({ round, matches }) => (
        <div key={round}>
          <p className={`${compact ? "mb-1 px-2 pt-2" : "mb-2"} text-xs font-medium uppercase tracking-wide text-text-3`}>
            Round {round}
          </p>
          <ul className={compact ? "border-t border-border-subtle" : "overflow-hidden rounded-lg border border-border"}>
            {matches.map((match) => {
              const isExpanded = expanded.has(match.id);
              const hasScores = match.matchGames.length > 0;

              return (
                <li key={match.id} className="border-b border-border-subtle last:border-b-0">
                  <div className={`flex items-center justify-between bg-surface ${compact ? "px-2 py-1.5" : "px-4 py-3"}`}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm ${
                          match.winnerId === match.player1Id
                            ? "font-semibold text-green-400"
                            : "text-text-2"
                        }`}
                      >
                        {match.player1?.displayName ?? "TBD"}{match.isDefault && match.winnerId === match.player1Id ? " (D)" : ""}
                      </span>
                      <span className="text-xs text-text-3">vs</span>
                      <span
                        className={`text-sm ${
                          match.winnerId === match.player2Id
                            ? "font-semibold text-green-400"
                            : "text-text-2"
                        }`}
                      >
                        {match.player2?.displayName ?? "TBD"}{match.isDefault && match.winnerId === match.player2Id ? " (D)" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Player actions */}
                      {!isTD && match.status === "PENDING" && match.player1Id && match.player2Id &&
                        viewerProfileId && (viewerProfileId === match.player1Id || viewerProfileId === match.player2Id) && (
                        <Link
                          href={`/matches/${match.id}/submit`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Submit
                        </Link>
                      )}
                      {!isTD && match.status === "AWAITING_CONFIRMATION" &&
                        viewerProfileId && (viewerProfileId === match.player1Id || viewerProfileId === match.player2Id) && (
                        <Link
                          href={`/matches/${match.id}/confirm`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Confirm
                        </Link>
                      )}
                      {/* TD actions */}
                      {isTD && (match.status === "PENDING" || match.status === "AWAITING_CONFIRMATION") && match.player1Id && match.player2Id && (
                        <Link
                          href={`/matches/${match.id}/td-submit`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Enter result
                        </Link>
                      )}
                      {isTD && (match.status === "COMPLETED" || match.status === "AWAITING_CONFIRMATION") && (
                        <form action={tdVoidMatchAction.bind(null, match.id, tournamentId, eventId, voidReturnTo)} className="flex items-center">
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-400 hover:underline"
                          >
                            Void
                          </button>
                        </form>
                      )}
                      {/* Expand toggle for completed matches with scores */}
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

                  {/* Expanded per-game scores */}
                  {isExpanded && hasScores && (
                    <div className={`border-t border-border-subtle bg-elevated ${compact ? "px-2 pb-2 pt-1" : "px-4 pb-3 pt-2"}`}>
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
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
