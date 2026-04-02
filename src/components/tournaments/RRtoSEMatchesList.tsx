"use client";

import { useState } from "react";
import { EventMatchRow, type SerializedEventMatch } from "@/components/tournaments/EventMatchRow";

function getRoundLabel(round: number, maxRound: number) {
  if (round === maxRound) return "Final";
  if (round === maxRound - 1) return "Semifinals";
  if (round === maxRound - 2) return "Quarterfinals";
  if (round === maxRound - 3) return "Round of 16";
  if (round === maxRound - 4) return "Round of 32";
  return `Round of ${Math.pow(2, maxRound - round + 1)}`;
}

export function RRtoSEMatchesList({
  matches,
}: {
  matches: SerializedEventMatch[];
}) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredMatches =
    normalizedQuery.length === 0
      ? matches
      : matches.filter((match) => {
          const player1Name = match.player1?.displayName.toLowerCase() ?? "";
          const player2Name = match.player2?.displayName.toLowerCase() ?? "";
          return (
            player1Name.includes(normalizedQuery) ||
            player2Name.includes(normalizedQuery)
          );
        });

  const allRRMatches = matches.filter((match) => match.groupNumber !== null);
  const allSEMatches = matches.filter((match) => match.groupNumber === null);
  const rrMatches = filteredMatches.filter((match) => match.groupNumber !== null);
  const seMatches = filteredMatches.filter((match) => match.groupNumber === null);
  const rrGroupNumbers = [
    ...new Set(
      rrMatches
        .map((match) => match.groupNumber)
        .filter((group): group is number => group !== null),
    ),
  ].sort((a, b) => a - b);
  const seRounds = [...new Set(seMatches.map((match) => match.round))].sort((a, b) => b - a);
  const maxRound = seMatches.length > 0 ? Math.max(...seMatches.map((match) => match.round)) : 0;

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search players"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-border-subtle"
      />

      <div className="grid grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-1">Round Robin</h2>
          {allRRMatches.length === 0 ? (
            <p className="text-sm text-text-2">No matches found.</p>
          ) : rrMatches.length === 0 ? (
            <p className="text-sm text-text-2">No matches found.</p>
          ) : (
            rrGroupNumbers.map((groupNumber) => (
              <div key={groupNumber} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                  Group {groupNumber}
                </p>
                <ul className="overflow-hidden rounded-lg border border-border">
                  {rrMatches
                    .filter((match) => match.groupNumber === groupNumber)
                    .map((match) => (
                      <EventMatchRow key={match.id} match={match} showStatus={false} />
                    ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-1">Single Elimination</h2>
          {allSEMatches.length === 0 ? (
            <p className="text-sm text-text-3">SE bracket not yet generated</p>
          ) : seMatches.length === 0 ? (
            <p className="text-sm text-text-2">No matches found.</p>
          ) : (
            seRounds.map((round) => (
              <div key={round} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                  {getRoundLabel(round, maxRound)}
                </p>
                <ul className="overflow-hidden rounded-lg border border-border">
                  {seMatches
                    .filter((match) => match.round === round)
                    .map((match) => (
                      <EventMatchRow key={match.id} match={match} showStatus={false} />
                    ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
