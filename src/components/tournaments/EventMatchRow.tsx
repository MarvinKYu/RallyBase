"use client";

import { useState } from "react";

export type SerializedEventMatch = {
  id: string;
  round: number;
  status: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  player1: { id: string; displayName: string } | null;
  player2: { id: string; displayName: string } | null;
  matchGames: { gameNumber: number; player1Points: number; player2Points: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Upcoming",
  IN_PROGRESS: "In progress",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  COMPLETED: "Completed",
};

export function EventMatchRow({ match }: { match: SerializedEventMatch }) {
  const [expanded, setExpanded] = useState(false);

  const hasScores = match.matchGames.length > 0;
  const p1Name = match.player1?.displayName ?? "TBD";
  const p2Name = match.player2?.displayName ?? "TBD";
  const p1Bold = match.winnerId !== null && match.winnerId === match.player1Id;
  const p2Bold = match.winnerId !== null && match.winnerId === match.player2Id;

  return (
    <li className="border-b border-border-subtle last:border-b-0">
      <div
        className={`flex items-center gap-3 bg-surface px-4 py-3${hasScores ? " cursor-pointer" : ""}`}
        onClick={hasScores ? () => setExpanded((v) => !v) : undefined}
      >
        {hasScores && (
          <span className="shrink-0 text-xs text-text-3">{expanded ? "▴" : "▾"}</span>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-sm text-text-1">
            <span className={p1Bold ? "font-semibold" : ""}>{p1Name}</span>
            {" vs "}
            <span className={p2Bold ? "font-semibold" : ""}>{p2Name}</span>
          </span>
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-3">
            {STATUS_LABEL[match.status] ?? match.status}
          </span>
        </div>
        <span className="shrink-0 text-xs text-text-3">R{match.round}</span>
      </div>

      {expanded && hasScores && (
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
    </li>
  );
}
