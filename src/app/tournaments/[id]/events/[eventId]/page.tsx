import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail, checkEligibility } from "@/server/services/tournament.service";
import { getEventBracket, bracketExists, getEventPodium } from "@/server/services/bracket.service";
import { getMyProfile } from "@/server/services/player.service";
import { EventPlayerMatchList, type SerializedPlayerEventMatch } from "@/components/tournaments/EventPlayerMatchList";
import { EventMatchesPreview } from "@/components/tournaments/EventMatchesPreview";
import type { SerializedEventMatch } from "@/components/tournaments/EventMatchRow";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} — RallyBase` : "Event not found" };
}

const FORMAT_LABEL: Record<string, string> = {
  BEST_OF_3: "Best of 3",
  BEST_OF_5: "Best of 5",
  BEST_OF_7: "Best of 7",
};

const STATUS_PILL_CLASS: Record<string, string> = {
  DRAFT: "bg-surface border border-border text-text-3",
  REGISTRATION_OPEN: "bg-green-950/60 border border-green-800 text-green-300",
  IN_PROGRESS: "bg-amber-950/60 border border-amber-800 text-amber-300",
  COMPLETED: "bg-surface border border-border text-text-2",
};

type PlayerEventStatus =
  | "not_signed_in"
  | "registered"
  | "event_full"
  | "ineligible"
  | "eligible"
  | "not_entered";

export default async function EventDetailPage({ params }: Props) {
  const { id, eventId } = await params;
  const { userId } = await auth();

  const [event, allMatchesRaw, hasBracket] = await Promise.all([
    getEventDetail(eventId),
    getEventBracket(eventId),
    bracketExists(eventId),
  ]);
  if (!event) notFound();

  const isRoundRobin = event.eventFormat === "ROUND_ROBIN";
  const isRRToSE = event.eventFormat === "RR_TO_SE";
  const isGrouped = !!(event.groupSize);
  const podium = event.status === "COMPLETED"
    ? await getEventPodium(eventId, event.eventFormat, event.groupSize)
    : null;

  // ── Groups computation ────────────────────────────────────────────────────
  const groups: Array<{
    groupNumber: number;
    groupComplete: boolean;
    players: Array<{
      playerProfileId: string;
      displayName: string;
      rating: number | null;
      wins: number;
      losses: number;
      rank: number | null;
    }>;
  }> = [];

  if (isGrouped && (isRoundRobin || isRRToSE)) {
    const groupNums = [
      ...new Set(
        event.eventEntries
          .map((e) => e.groupNumber)
          .filter((g): g is number => g !== null),
      ),
    ].sort((a, b) => a - b);

    for (const groupNum of groupNums) {
      const groupEntries = event.eventEntries.filter((e) => e.groupNumber === groupNum);
      const allGroupMatches = allMatchesRaw.filter((m) => m.groupNumber === groupNum);
      const completedGroupMatches = allGroupMatches.filter((m) => m.status === "COMPLETED");
      const groupComplete =
        allGroupMatches.length > 0 && allGroupMatches.length === completedGroupMatches.length;

      const wl = new Map<string, { wins: number; losses: number }>();
      for (const e of groupEntries) wl.set(e.playerProfileId, { wins: 0, losses: 0 });
      for (const m of completedGroupMatches) {
        if (!m.winnerId || !m.player1Id || !m.player2Id) continue;
        const p1 = wl.get(m.player1Id);
        const p2 = wl.get(m.player2Id);
        if (m.winnerId === m.player1Id) {
          if (p1) p1.wins++;
          if (p2) p2.losses++;
        } else {
          if (p2) p2.wins++;
          if (p1) p1.losses++;
        }
      }

      const rawPlayers = groupEntries.map((e) => {
        const ratingRow = e.playerProfile.playerRatings.find(
          (r) => r.ratingCategoryId === event.ratingCategoryId,
        );
        return {
          playerProfileId: e.playerProfileId,
          displayName: e.playerProfile.displayName,
          rating: ratingRow ? ratingRow.rating : null,
          wins: wl.get(e.playerProfileId)?.wins ?? 0,
          losses: wl.get(e.playerProfileId)?.losses ?? 0,
        };
      });

      const sortedPlayers = groupComplete
        ? [...rawPlayers].sort((a, b) => b.wins - a.wins)
        : rawPlayers;

      const rankList: number[] = [];
      if (groupComplete) {
        for (let i = 0; i < sortedPlayers.length; i++) {
          if (i === 0) {
            rankList.push(1);
          } else if (sortedPlayers[i].wins === sortedPlayers[i - 1].wins) {
            rankList.push(rankList[i - 1]);
          } else {
            rankList.push(i + 1);
          }
        }
      }

      groups.push({
        groupNumber: groupNum,
        groupComplete,
        players: sortedPlayers.map((p, i) => ({
          ...p,
          rank: groupComplete ? rankList[i] : null,
        })),
      });
    }
  }

  // ── Eligibility display lines (left column) ───────────────────────────────
  const eligibilityLines: string[] = [];
  if (event.maxParticipants) eligibilityLines.push(`Max ${event.maxParticipants} players`);
  if (event.minRating) eligibilityLines.push(`Min rating: ${Math.round(event.minRating)}`);
  if (event.maxRating) eligibilityLines.push(`Max rating: ${Math.round(event.maxRating)}`);
  if (event.minAge) eligibilityLines.push(`Min age: ${event.minAge}`);
  if (event.maxAge) eligibilityLines.push(`Max age: ${event.maxAge}`);
  if (event.allowedGender === "MALE") eligibilityLines.push("Male only");
  if (event.allowedGender === "FEMALE") eligibilityLines.push("Female only");

  // Serialize all matches
  const allMatches: SerializedEventMatch[] = allMatchesRaw.map((m) => ({
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
  }));

  // Auth-dependent: determine player status and their matches
  const viewerProfile = userId ? await getMyProfile() : null;

  let playerStatus: PlayerEventStatus = "not_signed_in";
  let playerProfileId: string | null = null;
  let playerMatches: SerializedPlayerEventMatch[] = [];

  if (viewerProfile) {
    playerProfileId = viewerProfile.id;
    const isEntered = event.eventEntries.some(
      (e) => e.playerProfileId === viewerProfile.id,
    );

    if (isEntered) {
      playerStatus = "registered";
      playerMatches = allMatches.filter(
        (m) => m.player1Id === viewerProfile.id || m.player2Id === viewerProfile.id,
      );
    } else if (event.status === "REGISTRATION_OPEN") {
      const isFull =
        event.maxParticipants !== null &&
        event.maxParticipants !== undefined &&
        event.eventEntries.length >= event.maxParticipants;

      if (isFull) {
        playerStatus = "event_full";
      } else {
        const playerRating =
          viewerProfile.playerRatings.find(
            (r) => r.ratingCategoryId === event.ratingCategoryId,
          ) ?? null;
        const eligResult = checkEligibility(
          viewerProfile,
          playerRating,
          event,
          event.eventEntries.length,
        );
        playerStatus = eligResult.eligible ? "eligible" : "ineligible";
      }
    } else {
      playerStatus = "not_entered";
    }
  }

  const isRegistered = playerStatus === "registered";

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Breadcrumb */}
          <p className="text-sm text-text-3">
            <Link href={`/tournaments/${id}`} className="transition-colors hover:text-text-2">
              {event.tournament.name}
            </Link>
          </p>

          {/* Event name + status pill */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold leading-tight text-text-1">{event.name}</h1>
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL_CLASS[event.status] ?? "bg-surface border border-border text-text-3"}`}
              >
                {event.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-2">
              {event.ratingCategory.name} ·{" "}
              {isRoundRobin
                ? "Round Robin"
                : isRRToSE
                  ? "Round Robin → Single Elimination"
                  : "Single Elimination"}{" "}
              · {FORMAT_LABEL[event.format] ?? event.format} · First to {event.gamePointTarget}
            </p>
            {(event as { startTime?: Date | null }).startTime && (
              <p className="mt-1 text-sm text-text-3">
                Starts{" "}
                {new Date(
                  (event as { startTime: Date }).startTime,
                ).toLocaleString()}
              </p>
            )}
            {eligibilityLines.length > 0 && playerStatus !== "not_signed_in" && (
              <p className="mt-1 text-xs text-text-3">{eligibilityLines.join(" · ")}</p>
            )}

            {/* Bracket/standings + eligibility status row */}
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {(isRoundRobin || (isRRToSE && hasBracket)) && (
                  <Link
                    href={`/tournaments/${id}/events/${eventId}/standings`}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
                  >
                    View groups
                  </Link>
                )}
                {hasBracket && !isRoundRobin && (
                  <Link
                    href={`/tournaments/${id}/events/${eventId}/bracket`}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
                  >
                    View bracket
                  </Link>
                )}
              </div>
              <div>
                {playerStatus === "registered" && (
                  <span className="inline-flex items-center rounded-full border border-green-800 bg-green-950/60 px-2.5 py-0.5 text-xs font-medium text-green-300">
                    REGISTERED
                  </span>
                )}
                {playerStatus === "event_full" && (
                  <span className="inline-flex items-center rounded-full border border-red-800 bg-red-950/60 px-2.5 py-0.5 text-xs font-medium text-red-300">
                    EVENT FULL
                  </span>
                )}
                {playerStatus === "ineligible" && (
                  <span className="inline-flex items-center rounded-full border border-red-800 bg-red-950/60 px-2.5 py-0.5 text-xs font-medium text-red-300">
                    INELIGIBLE
                  </span>
                )}
                {playerStatus === "eligible" && (
                  <Link
                    href={`/tournaments/${id}/register`}
                    className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
                  >
                    Sign up
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Results (completed events only) */}
          {podium?.first && (
            <section>
              <h2 className="mb-3 text-base font-medium text-text-1">Results</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-6 shrink-0 text-xs text-text-3">1st</span>
                  <Link
                    href={`/profile/${podium.first.id}`}
                    className="font-medium text-text-1 transition-colors hover:underline"
                  >
                    {podium.first.displayName}
                  </Link>
                </div>
                {podium.second && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-6 shrink-0 text-xs text-text-3">2nd</span>
                    <Link
                      href={`/profile/${podium.second.id}`}
                      className="text-text-2 transition-colors hover:underline"
                    >
                      {podium.second.displayName}
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Entrants */}
          <section>
            <h2 className="mb-4 text-base font-medium text-text-1">
              Entrants ({event.eventEntries.length}
              {event.maxParticipants ? `/${event.maxParticipants}` : ""})
            </h2>
            {event.eventEntries.length === 0 ? (
              <p className="text-sm text-text-2">No entrants yet.</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-border">
                {event.eventEntries.map((entry) => {
                  const rating = entry.playerProfile.playerRatings.find(
                    (r) => r.ratingCategoryId === event.ratingCategoryId,
                  );
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
                    >
                      <Link
                        href={`/profile/${entry.playerProfileId}`}
                        className="text-sm font-medium text-text-1 transition-colors hover:underline"
                      >
                        {entry.playerProfile.displayName}
                      </Link>
                      <span className="text-sm text-text-2">
                        {rating ? Math.round(rating.rating) : "Unrated"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Link
            href={`/tournaments/${id}`}
            className="text-sm text-text-2 transition-colors hover:text-text-1"
          >
            ← Back to tournament
          </Link>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-8">

          {/* Groups section — RR and RR_TO_SE grouped events */}
          {groups.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-medium text-text-1">Groups</h2>
              <div className="grid grid-cols-4 gap-3">
                {groups.map((group) => (
                  <div
                    key={group.groupNumber}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">
                      Group {group.groupNumber}
                    </p>
                    <table className="w-full">
                      <thead>
                        <tr>
                          {group.groupComplete && (
                            <th className="pb-1 w-4 text-left text-xs font-medium text-text-3">#</th>
                          )}
                          <th className="pb-1 text-left text-xs font-medium text-text-3">Player</th>
                          <th className="pb-1 text-right text-xs font-medium text-text-3">Rtg</th>
                          <th className="pb-1 text-right text-xs font-medium text-text-3 whitespace-nowrap">W-L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.players.map((p) => {
                          const rank = p.rank;
                          const isAdvancer =
                            !!event.advancersPerGroup &&
                            rank !== null &&
                            rank <= event.advancersPerGroup;
                          const rankColor =
                            rank === 1
                              ? "text-amber-400"
                              : rank === 2
                                ? "text-gray-400"
                                : rank === 3
                                  ? "text-orange-500"
                                  : "text-text-3";
                          return (
                            <tr key={p.playerProfileId}>
                              {group.groupComplete && (
                                <td
                                  className={`py-0.5 pr-1 text-xs ${rankColor} ${isAdvancer ? "font-bold" : ""}`}
                                >
                                  {rank}
                                </td>
                              )}
                              <td className="py-0.5 pr-2 text-xs text-text-1 truncate max-w-0 w-full">
                                {p.displayName}
                              </td>
                              <td className="py-0.5 pr-2 text-right text-xs text-text-3">
                                {p.rating !== null ? Math.round(p.rating) : "—"}
                              </td>
                              <td
                                className={`py-0.5 text-right text-xs whitespace-nowrap ${isAdvancer ? "font-semibold text-text-1" : "text-text-2"}`}
                              >
                                {p.wins}-{p.losses}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Matches section */}
          {isRegistered ? (
            <div>
              <h2 className="mb-3 text-base font-medium text-text-1">Your Matches</h2>
              <EventPlayerMatchList
                matches={playerMatches}
                viewerProfileId={playerProfileId!}
              />
            </div>
          ) : (
            <div>
              <h2 className="mb-3 text-base font-medium text-text-1">
                Matches ({allMatches.length})
              </h2>
              <EventMatchesPreview
                matches={allMatches}
                viewAllHref={`/tournaments/${id}/events/${eventId}/matches`}
              />
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
