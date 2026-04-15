import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail } from "@/server/services/tournament.service";
import { getMyProfile } from "@/server/services/player.service";
import {
  getEventBracket,
  getRoundRobinStandings,
  type GroupedRoundRobinStandings,
  type RoundRobinStanding,
} from "@/server/services/bracket.service";
import { StandingsSchedule, type SerializedMatch } from "@/components/tournaments/StandingsSchedule";
import { StandingsTable } from "@/components/tournaments/StandingsTable";
import { GroupSwitcher } from "@/components/tournaments/GroupSwitcher";
import { isAuthorizedAsTD } from "@/server/services/admin.service";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} Groups — RallyBase` : "Groups not found" };
}

export default async function StandingsPage({ params, searchParams }: Props) {
  const { id, eventId } = await params;
  const { from } = await searchParams;
  const { userId } = await auth();
  const [event, matches, viewerProfile] = await Promise.all([
    getEventDetail(eventId),
    getEventBracket(eventId),
    userId ? getMyProfile() : Promise.resolve(null),
  ]);
  const viewerProfileId = viewerProfile?.id ?? null;

  if (!event) notFound();
  if (event.eventFormat !== "ROUND_ROBIN" && event.eventFormat !== "RR_TO_SE") redirect(`/tournaments/${id}/events/${eventId}`);

  const isGrouped = !!event.groupSize;
  const standingsData = isGrouped
    ? await getRoundRobinStandings(eventId, true)
    : await getRoundRobinStandings(eventId);

  // For RR_TO_SE: exclude SE phase matches (groupNumber = null) from the schedule
  const rrMatches = event.eventFormat === "RR_TO_SE"
    ? matches.filter((m) => (m as typeof m & { groupNumber?: number | null }).groupNumber !== null)
    : matches;

  const isTD = !!userId && await isAuthorizedAsTD(userId, event.tournament);

  // Serialize matches and group by [groupNumber, round]
  function serializeMatch(m: (typeof matches)[0]): SerializedMatch {
    return {
      id: m.id,
      round: m.round,
      status: m.status,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      winnerId: m.winnerId,
      isDefault: m.isDefault ?? false,
      player1: m.player1 ? { id: m.player1.id, displayName: m.player1.displayName } : null,
      player2: m.player2 ? { id: m.player2.id, displayName: m.player2.displayName } : null,
      matchGames: m.matchGames.map((g) => ({
        gameNumber: g.gameNumber,
        player1Points: g.player1Points,
        player2Points: g.player2Points,
      })),
    };
  }

  type ScheduleSection = {
    groupNumber: number | null;
    rounds: { round: number; matches: SerializedMatch[] }[];
  };

  const groupMatchMap = new Map<number | null, Map<number, SerializedMatch[]>>();
  for (const m of rrMatches) {
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

  const backHref =
    from === "manage"
      ? `/tournaments/${id}/events/${eventId}/manage`
      : `/tournaments/${id}/events/${eventId}`;
  const backLabel = from === "manage" ? "← Back to manage event" : "← Back to event";
  const tournamentHref = from === "manage" ? `/tournaments/${id}/manage` : `/tournaments/${id}`;
  const eventHref = from === "manage" ? `/tournaments/${id}/events/${eventId}/manage` : `/tournaments/${id}/events/${eventId}`;

  // ── Grouped layout (multi-group RR or RR_TO_SE) ────────────────────────────
  if (isGrouped) {
    const groups = standingsData as GroupedRoundRobinStandings[];

    return (
      <main className="flex h-screen flex-col px-4 pt-6 pb-3">
        <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col gap-3">
          {/* Header */}
          <div className="shrink-0">
            <p className="text-sm text-text-3">
              <Link href={tournamentHref} className="hover:text-text-2">
                {event.tournament.name}
              </Link>
              {" / "}
              <Link href={eventHref} className="hover:text-text-2">
                {event.name}
              </Link>
            </p>
            <h1 className="text-2xl font-semibold text-text-1">Group Standings and Matches</h1>
          </div>

          {/* Group switcher — mobile shows one group at a time; desktop shows grid */}
          <GroupSwitcher
            groups={groups}
            scheduleSections={scheduleSections}
            isTD={isTD}
            tournamentId={id}
            eventId={eventId}
            voidReturnTo={`/tournaments/${id}/events/${eventId}/standings${from ? `?from=${from}` : ""}`}
            viewerProfileId={viewerProfileId}
          />

          {/* Back link */}
          <div className="shrink-0">
            <Link href={backHref} className="text-sm text-text-2 transition-colors hover:text-text-1">
              {backLabel}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Single-group legacy layout ──────────────────────────────────────────────
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
          <h1 className="text-2xl font-semibold text-text-1">Group Standings and Matches</h1>
        </div>

        {(standingsData as RoundRobinStanding[]).length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-medium text-text-1">Current standings</h2>
            <StandingsTable standings={standingsData as RoundRobinStanding[]} tournamentId={id} />
          </section>
        )}

        {rrMatches.length === 0 ? (
          <p className="text-sm text-text-2">No matches generated yet.</p>
        ) : (
          <section>
            <h2 className="mb-3 text-lg font-medium text-text-1">Schedule</h2>
            <StandingsSchedule
              rounds={scheduleSections[0]?.rounds ?? []}
              isTD={isTD}
              tournamentId={id}
              eventId={eventId}
              voidReturnTo={`/tournaments/${id}/events/${eventId}/standings${from ? `?from=${from}` : ""}`}
              viewerProfileId={viewerProfileId}
            />
          </section>
        )}

        <Link href={backHref} className="text-sm text-text-2 transition-colors hover:text-text-1">
          {backLabel}
        </Link>
      </div>
    </main>
  );
}

