"use client";

import { useState } from "react";
import { type GroupedRoundRobinStandings } from "@/server/services/bracket.service";
import { StandingsSchedule, type SerializedMatch } from "@/components/tournaments/StandingsSchedule";
import { StandingsTable } from "@/components/tournaments/StandingsTable";

type ScheduleSection = {
  groupNumber: number | null;
  rounds: { round: number; matches: SerializedMatch[] }[];
};

type CardProps = {
  g: GroupedRoundRobinStandings;
  section: ScheduleSection | undefined;
  isTD: boolean;
  tournamentId: string;
  eventId: string;
  voidReturnTo: string;
  viewerProfileId: string | null;
};

function GroupCard({ g, section, isTD, tournamentId, eventId, voidReturnTo, viewerProfileId }: CardProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border">
      {/* Group header */}
      <div className="shrink-0 border-b border-border bg-elevated px-3 py-2">
        <h2 className="text-sm font-semibold text-text-1">Group {g.groupNumber}</h2>
      </div>

      {/* Standings table */}
      {g.standings.length > 0 && (
        <div className="shrink-0">
          <StandingsTable standings={g.standings} tournamentId={tournamentId} />
        </div>
      )}

      {/* Matches — scrollable */}
      {section && section.rounds.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-subtle">
          <StandingsSchedule
            rounds={section.rounds}
            isTD={isTD}
            tournamentId={tournamentId}
            eventId={eventId}
            voidReturnTo={voidReturnTo}
            compact
            viewerProfileId={viewerProfileId}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-text-3">No matches yet</p>
        </div>
      )}
    </div>
  );
}

type Props = {
  groups: GroupedRoundRobinStandings[];
  scheduleSections: ScheduleSection[];
  isTD: boolean;
  tournamentId: string;
  eventId: string;
  voidReturnTo: string;
  viewerProfileId: string | null;
};

export function GroupSwitcher({
  groups,
  scheduleSections,
  isTD,
  tournamentId,
  eventId,
  voidReturnTo,
  viewerProfileId,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeGroup = groups[activeIndex];

  return (
    <>
      {/* Mobile group nav bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-border bg-elevated px-3 py-2 sm:hidden">
        <button
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          disabled={activeIndex === 0}
          className="flex h-7 w-7 items-center justify-center rounded text-text-2 transition-colors hover:bg-surface hover:text-text-1 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous group"
        >
          &#8249;
        </button>
        <span className="text-sm font-semibold text-text-1">Group {activeGroup.groupNumber}</span>
        <button
          onClick={() => setActiveIndex((i) => Math.min(groups.length - 1, i + 1))}
          disabled={activeIndex === groups.length - 1}
          className="flex h-7 w-7 items-center justify-center rounded text-text-2 transition-colors hover:bg-surface hover:text-text-1 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next group"
        >
          &#8250;
        </button>
      </div>

      {/* Mobile: single active group card */}
      <div className="flex min-h-0 flex-1 flex-col sm:hidden">
        <GroupCard
          g={activeGroup}
          section={scheduleSections.find((s) => s.groupNumber === activeGroup.groupNumber)}
          isTD={isTD}
          tournamentId={tournamentId}
          eventId={eventId}
          voidReturnTo={voidReturnTo}
          viewerProfileId={viewerProfileId}
        />
      </div>

      {/* Desktop: all groups in grid */}
      <div
        className="hidden min-h-0 flex-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
        style={{ gridAutoRows: "1fr" }}
      >
        {groups.map((g) => (
          <GroupCard
            key={g.groupNumber}
            g={g}
            section={scheduleSections.find((s) => s.groupNumber === g.groupNumber)}
            isTD={isTD}
            tournamentId={tournamentId}
            eventId={eventId}
            voidReturnTo={voidReturnTo}
            viewerProfileId={viewerProfileId}
          />
        ))}
      </div>
    </>
  );
}
