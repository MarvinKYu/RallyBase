"use client";

import { useState } from "react";
import type { MatchStatus } from "@prisma/client";
import { getRoundLabel } from "@/lib/bracket-labels";

type Match = {
  id: string;
  round: number;
  groupNumber: number | null;
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

function MatchItem({ match }: { match: Match }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
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
  );
}

function SectionHeader({
  label,
  indent,
}: {
  label: string;
  indent?: boolean;
}) {
  return (
    <p
      className={`bg-elevated/50 py-1.5 text-xs font-medium uppercase tracking-wide text-text-3 ${
        indent ? "pl-8 pr-4" : "px-4"
      }`}
    >
      {label}
    </p>
  );
}

export function EventMatchList({
  matches,
  eventFormat,
  groupSize,
}: {
  matches: Match[];
  eventFormat: string;
  groupSize?: number | null;
}) {
  const [collapsed, setCollapsed] = useState(true);

  const isRRToSE = eventFormat === "RR_TO_SE";
  const isGroupedRR = eventFormat === "ROUND_ROBIN" && !!groupSize;
  const isSE = eventFormat === "SINGLE_ELIMINATION";

  // ── Build sections ────────────────────────────────────────────────────────

  type Section = { label: string; matches: Match[] };

  const rrMatches = matches.filter((m) => m.groupNumber !== null);
  const seMatches = matches.filter((m) => m.groupNumber === null);

  const rrSections: Section[] = [];
  const seSections: Section[] = [];

  if (isRRToSE) {
    // RR groups
    const groupNums = [
      ...new Set(rrMatches.map((m) => m.groupNumber as number)),
    ].sort((a, b) => a - b);
    for (const g of groupNums) {
      rrSections.push({
        label: `Group ${g}`,
        matches: rrMatches.filter((m) => m.groupNumber === g),
      });
    }
    // SE rounds with proper labels
    const seRounds = [...new Set(seMatches.map((m) => m.round))].sort((a, b) => a - b);
    const seTotalRounds = seRounds.length > 0 ? Math.max(...seRounds) : 1;
    for (const r of seRounds) {
      seSections.push({
        label: getRoundLabel(r, seTotalRounds),
        matches: seMatches.filter((m) => m.round === r),
      });
    }
  } else if (isGroupedRR) {
    const groupNums = [
      ...new Set(
        matches.map((m) => m.groupNumber).filter((g): g is number => g !== null),
      ),
    ].sort((a, b) => a - b);
    for (const g of groupNums) {
      rrSections.push({
        label: `Group ${g}`,
        matches: matches.filter((m) => m.groupNumber === g),
      });
    }
  } else if (isSE) {
    const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
    const totalRounds = rounds.length > 0 ? Math.max(...rounds) : 1;
    for (const r of rounds) {
      seSections.push({
        label: getRoundLabel(r, totalRounds),
        matches: matches.filter((m) => m.round === r),
      });
    }
  } else {
    // Single-group RR: by round
    const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
    for (const r of rounds) {
      rrSections.push({ label: `Round ${r}`, matches: matches.filter((m) => m.round === r) });
    }
  }

  const flatSections: Section[] = isRRToSE ? [] : [...rrSections, ...seSections];

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
          ) : isRRToSE ? (
            <div className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
              {rrSections.length > 0 && (
                <>
                  <SectionHeader label="Round Robin Phase" />
                  {rrSections.map((s) => (
                    <div key={s.label}>
                      <SectionHeader label={s.label} indent />
                      {s.matches.map((m) => (
                        <MatchItem key={m.id} match={m} />
                      ))}
                    </div>
                  ))}
                </>
              )}
              {seSections.length > 0 && (
                <>
                  <SectionHeader label="Bracket Phase" />
                  {seSections.map((s) => (
                    <div key={s.label}>
                      <SectionHeader label={s.label} indent />
                      {s.matches.map((m) => (
                        <MatchItem key={m.id} match={m} />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
              {flatSections.map((s) => (
                <div key={s.label}>
                  <SectionHeader label={s.label} />
                  {s.matches.map((m) => (
                    <MatchItem key={m.id} match={m} />
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
