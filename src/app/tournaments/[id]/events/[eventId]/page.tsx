import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail, checkEligibility } from "@/server/services/tournament.service";
import { getEventBracket, bracketExists } from "@/server/services/bracket.service";
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

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: "text-text-3",
  REGISTRATION_OPEN: "text-accent",
  IN_PROGRESS: "text-yellow-400",
  COMPLETED: "text-text-3",
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

  // Eligibility display lines (left column)
  const eligibilityLines: string[] = [];
  if (event.maxParticipants) eligibilityLines.push(`Max ${event.maxParticipants} players`);
  if (event.minRating) eligibilityLines.push(`Min rating: ${Math.round(event.minRating)}`);
  if (event.maxRating) eligibilityLines.push(`Max rating: ${Math.round(event.maxRating)}`);
  if (event.minAge) eligibilityLines.push(`Min age: ${event.minAge}`);
  if (event.maxAge) eligibilityLines.push(`Max age: ${event.maxAge}`);

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

          {/* Event name */}
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-text-1">{event.name}</h1>
            <p className="mt-1 text-sm text-text-2">
              {event.ratingCategory.name} ·{" "}
              {isRoundRobin ? "Round Robin" : "Single Elimination"} ·{" "}
              {FORMAT_LABEL[event.format] ?? event.format} · First to {event.gamePointTarget}
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

            {/* Status badge */}
            <div className="mt-2">
              <span
                className={`text-xs font-medium ${STATUS_BADGE_CLASS[event.status] ?? "text-text-3"}`}
              >
                {event.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Registration status block */}
            {playerStatus === "registered" && (
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full bg-green-950/60 border border-green-800 px-2.5 py-0.5 text-xs font-medium text-green-300">
                  REGISTERED
                </span>
              </div>
            )}
            {playerStatus === "event_full" && (
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full bg-red-950/60 border border-red-800 px-2.5 py-0.5 text-xs font-medium text-red-300">
                  EVENT FULL
                </span>
              </div>
            )}
            {playerStatus === "ineligible" && (
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full bg-red-950/60 border border-red-800 px-2.5 py-0.5 text-xs font-medium text-red-300">
                  INELIGIBLE
                </span>
              </div>
            )}
            {playerStatus === "eligible" && (
              <div className="mt-3">
                <Link
                  href={`/tournaments/${id}/register`}
                  className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

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
        <div className="flex flex-col gap-6">
          {isRegistered ? (
            <>
              <div>
                <h2 className="mb-3 text-base font-medium text-text-1">Your Matches</h2>
                <EventPlayerMatchList
                  matches={playerMatches}
                  viewerProfileId={playerProfileId!}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="mb-3 text-base font-medium text-text-1">
                  Matches ({allMatches.length})
                </h2>
                <EventMatchesPreview
                  matches={allMatches}
                  viewAllHref={`/tournaments/${id}/events/${eventId}/matches`}
                />
              </div>
            </>
          )}

          {/* Bracket / standings links */}
          {(hasBracket || isRoundRobin) && (
            <div className="flex items-center gap-3">
              {hasBracket && !isRoundRobin && (
                <Link
                  href={`/tournaments/${id}/events/${eventId}/bracket`}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
                >
                  View bracket
                </Link>
              )}
              {isRoundRobin && (
                <Link
                  href={`/tournaments/${id}/events/${eventId}/standings`}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
                >
                  View standings
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
