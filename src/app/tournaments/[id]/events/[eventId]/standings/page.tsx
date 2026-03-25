import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail } from "@/server/services/tournament.service";
import {
  getEventBracket,
  getRoundRobinStandings,
  type GroupedRoundRobinStandings,
  type RoundRobinStanding,
} from "@/server/services/bracket.service";
import { StandingsSchedule, type SerializedMatch } from "@/components/tournaments/StandingsSchedule";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} Standings — RallyBase` : "Standings not found" };
}

export default async function StandingsPage({ params, searchParams }: Props) {
  const { id, eventId } = await params;
  const { from } = await searchParams;
  const { userId } = await auth();
  const [event, matches] = await Promise.all([
    getEventDetail(eventId),
    getEventBracket(eventId),
  ]);

  if (!event) notFound();
  if (event.eventFormat !== "ROUND_ROBIN") redirect(`/tournaments/${id}/events/${eventId}`);

  const isGrouped = !!event.groupSize;
  const standingsData = isGrouped
    ? await getRoundRobinStandings(eventId, true)
    : await getRoundRobinStandings(eventId);

  const isTD = !!userId && event.tournament.createdByClerkId === userId;

  // Serialize matches and group by [groupNumber, round]
  function serializeMatch(m: (typeof matches)[0]): SerializedMatch {
    return {
      id: m.id,
      round: m.round,
      status: m.status,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      winnerId: m.winnerId,
      player1: m.player1 ? { id: m.player1.id, displayName: m.player1.displayName } : null,
      player2: m.player2 ? { id: m.player2.id, displayName: m.player2.displayName } : null,
      matchGames: m.matchGames.map((g) => ({
        gameNumber: g.gameNumber,
        player1Points: g.player1Points,
        player2Points: g.player2Points,
      })),
    };
  }

  // Build per-group schedule sections (or single section when not grouped)
  type ScheduleSection = {
    groupNumber: number | null;
    rounds: { round: number; matches: SerializedMatch[] }[];
  };

  const groupMatchMap = new Map<number | null, Map<number, SerializedMatch[]>>();
  for (const m of matches) {
    const gNum = (m as typeof m & { groupNumber?: number | null }).groupNumber ?? null;
    if (!groupMatchMap.has(gNum)) groupMatchMap.set(gNum, new Map());
    const roundMap = groupMatchMap.get(gNum)!;
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(serializeMatch(m));
  }

  const scheduleSections: ScheduleSection[] = [...groupMatchMap.entries()]
    .sort(([a], [b]) => (a ?? 0) - (b ?? 0))
    .map(([groupNumber, roundMap]) => ({
      groupNumber,
      rounds: [...roundMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([round, ms]) => ({ round, matches: ms })),
    }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-text-3">
            <Link href={`/tournaments/${id}`} className="hover:text-text-2">
              {event.tournament.name}
            </Link>
            {" / "}
            <Link href={`/tournaments/${id}/events/${eventId}`} className="hover:text-text-2">
              {event.name}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-text-1">Standings</h1>
        </div>

        {/* Standings — grouped or single */}
        {isGrouped ? (
          // Multi-group: one section per group
          (standingsData as GroupedRoundRobinStandings[]).map((g) => (
            <div key={g.groupNumber} className="space-y-6">
              <h2 className="text-lg font-semibold text-text-1">Group {g.groupNumber}</h2>

              {g.standings.length > 0 && (
                <StandingsTable standings={g.standings} tournamentId={id} />
              )}

              {(() => {
                const section = scheduleSections.find((s) => s.groupNumber === g.groupNumber);
                return section && section.rounds.length > 0 ? (
                  <StandingsSchedule
                    rounds={section.rounds}
                    isTD={isTD}
                    tournamentId={id}
                    eventId={eventId}
                  />
                ) : null;
              })()}
            </div>
          ))
        ) : (
          // Single group (legacy)
          <>
            {(standingsData as RoundRobinStanding[]).length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-medium text-text-1">Current standings</h2>
                <StandingsTable standings={standingsData as RoundRobinStanding[]} tournamentId={id} />
              </section>
            )}

            {matches.length === 0 ? (
              <p className="text-sm text-text-2">No matches generated yet.</p>
            ) : (
              <section>
                <h2 className="mb-3 text-lg font-medium text-text-1">Schedule</h2>
                <StandingsSchedule
                  rounds={scheduleSections[0]?.rounds ?? []}
                  isTD={isTD}
                  tournamentId={id}
                  eventId={eventId}
                />
              </section>
            )}
          </>
        )}

        <Link
          href={
            from === "manage"
              ? `/tournaments/${id}/events/${eventId}/manage`
              : `/tournaments/${id}/events/${eventId}`
          }
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          {from === "manage" ? "← Back to manage event" : "← Back to event"}
        </Link>
      </div>
    </main>
  );
}

function StandingsTable({
  standings,
  tournamentId,
}: {
  standings: RoundRobinStanding[];
  tournamentId: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-elevated">
            <th className="px-4 py-2 text-left font-medium text-text-3">#</th>
            <th className="px-4 py-2 text-left font-medium text-text-3">Player</th>
            <th className="px-4 py-2 text-right font-medium text-text-3">W</th>
            <th className="px-4 py-2 text-right font-medium text-text-3">L</th>
            <th className="px-4 py-2 text-right font-medium text-text-3">Games</th>
            <th className="px-4 py-2 text-right font-medium text-text-3">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr
              key={s.playerProfileId}
              className="border-b border-border-subtle bg-surface last:border-b-0"
            >
              <td className="px-4 py-2 text-text-3">{s.tied ? `T-${s.rank}` : s.rank}</td>
              <td className="px-4 py-2 font-medium text-text-1">
                <Link
                  href={`/profile/${s.playerProfileId}`}
                  className="hover:text-accent hover:underline"
                >
                  {s.displayName}
                </Link>
              </td>
              <td className="px-4 py-2 text-right text-accent">{s.wins}</td>
              <td className="px-4 py-2 text-right text-text-2">{s.losses}</td>
              <td className="px-4 py-2 text-right text-text-3">
                {s.gamesWon}–{s.gamesLost}
              </td>
              <td className="px-4 py-2 text-right text-text-3">
                {s.pointsFor}–{s.pointsAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
