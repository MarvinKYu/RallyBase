"use client";

import { useState } from "react";
import type { MatchStatus } from "@prisma/client";

type Match = {
  id: string;
  round: number;
  status: MatchStatus;
  player1: { displayName: string } | null;
  player2: { displayName: string } | null;
  matchGames: { gameNumber: number; player1Points: number; player2Points: number }[];
};

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  COMPLETED: "Completed",
};

function ScoreSummary({
  games,
}: {
  games: { gameNumber: number; player1Points: number; player2Points: number }[];
}) {
  if (games.length === 0) return null;
  return (
    <span className="text-xs text-text-3">
      {games.map((g) => `${g.player1Points}–${g.player2Points}`).join(", ")}
    </span>
  );
}

export function EventMatchList({ matches }: { matches: Match[] }) {
  const [collapsed, setCollapsed] = useState(false);

  const matchesByRound = matches.reduce<Record<number, Match[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = [];
    acc[m.round].push(m);
    return acc;
  }, {});
  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="divide-y divide-border-subtle bg-surface">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-text-2 transition-colors hover:text-text-1"
      >
        <span>{collapsed ? "▸" : "▾"}</span>
        <span>Matches ({matches.length})</span>
      </button>
      {!collapsed && (
        <>
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-3">No bracket generated yet.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
              {rounds.map((round) => (
                <div key={round}>
                  <p className="bg-elevated/50 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-text-3">
                    Round {round}
                  </p>
                  {matchesByRound[round].map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm text-text-1">
                          {match.player1?.displayName ?? "TBD"} vs.{" "}
                          {match.player2?.displayName ?? "TBD"}
                        </p>
                        <ScoreSummary games={match.matchGames} />
                      </div>
                      <span
                        className={`text-xs ${
                          match.status === "COMPLETED" ? "text-text-3" : "text-text-2"
                        }`}
                      >
                        {MATCH_STATUS_LABELS[match.status]}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
