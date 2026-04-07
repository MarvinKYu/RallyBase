import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentDetail } from "@/server/services/tournament.service";
import { isAuthorizedAsTD } from "@/server/services/admin.service";
import {
  getMyProfile,
  getPlayerMatchesForTournament,
} from "@/server/services/player.service";
import { getEventPodium, type EventPodium } from "@/server/services/bracket.service";
import { YourMatchesList, type SerializedPlayerMatch } from "@/components/tournaments/YourMatchesList";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTournamentDetail(id);
  return { title: t ? `${t.name} — RallyBase` : "Tournament not found" };
}

const formatLabel: Record<string, string> = {
  BEST_OF_3: "Best of 3",
  BEST_OF_5: "Best of 5",
  BEST_OF_7: "Best of 7",
};

const eventStatusBadge: Record<string, string> = {
  DRAFT: "bg-surface border border-border text-text-3",
  REGISTRATION_OPEN: "bg-green-950/60 border border-green-800 text-green-300",
  IN_PROGRESS: "bg-amber-950/60 border border-amber-800 text-amber-300",
  COMPLETED: "bg-teal-950/60 border border-teal-800 text-teal-300",
};

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  // Draft guard: only creator/platform admin/org admin can view a draft
  if (tournament.status === "DRAFT") {
    if (!userId || !(await isAuthorizedAsTD(userId, tournament))) {
      redirect("/tournaments");
    }
  }

  // Fetch podiums for completed events
  const completedEvents = tournament.events.filter((e) => e.status === "COMPLETED");
  const podiumResults = await Promise.all(
    completedEvents.map((e) => getEventPodium(e.id, e.eventFormat, e.groupSize)),
  );
  const podiumMap = new Map<string, EventPodium>(
    completedEvents.map((e, i) => [e.id, podiumResults[i]]),
  );

  const viewerProfile = userId ? await getMyProfile() : null;
  const rawMatches = viewerProfile
    ? await getPlayerMatchesForTournament(viewerProfile.id, tournament.id)
    : [];
  const yourMatches: SerializedPlayerMatch[] = rawMatches.map((m) => ({
    id: m.id,
    round: m.round,
    status: m.status,
    player1Id: m.player1Id,
    player2Id: m.player2Id,
    winnerId: m.winnerId,
    player1: m.player1 ? { id: m.player1.id, displayName: m.player1.displayName } : null,
    player2: m.player2 ? { id: m.player2.id, displayName: m.player2.displayName } : null,
    event: { id: m.event.id, name: m.event.name },
    matchGames: m.matchGames.map((g) => ({
      gameNumber: g.gameNumber,
      player1Points: g.player1Points,
      player2Points: g.player2Points,
    })),
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <p className="text-sm text-text-3">{tournament.organization.name}</p>
          <h1 className="text-3xl font-semibold text-text-1">{tournament.name}</h1>
          {tournament.location && (
            <p className="mt-1 text-text-2">{tournament.location}</p>
          )}
          <p className="mt-1 text-sm text-text-3">
            {new Date(tournament.startDate).toLocaleDateString()}
            {tournament.endDate &&
              ` – ${new Date(tournament.endDate).toLocaleDateString()}`}
          </p>
          {(tournament as { startTime?: Date | null }).startTime && (
            <p className="mt-0.5 text-sm text-text-3">
              Starts {new Date((tournament as { startTime: Date }).startTime).toLocaleString()}
            </p>
          )}
          {tournament.status === "DRAFT" && (
            <p className="mt-2 rounded-md border border-amber-800 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
              This tournament is a draft and not visible to the public.
            </p>
          )}
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-1">Events</h2>
            {tournament.events.length > 0 && tournament.status !== "COMPLETED" && (
              <Link
                href={`/tournaments/${id}/register`}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
              >
                Register for Events
              </Link>
            )}
          </div>

          {tournament.events.length === 0 ? (
            <p className="text-sm text-text-2">No events yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border">
              {tournament.events.map((event) => {
                const podium = podiumMap.get(event.id);
                return (
                  <li
                    key={event.id}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <Link
                      href={`/tournaments/${id}/events/${event.id}`}
                      className="flex items-center justify-between bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-1">{event.name}</p>
                        <p className="text-xs text-text-3">
                          {event.ratingCategory.name} · {formatLabel[event.format] ?? event.format}
                        </p>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${eventStatusBadge[event.status] ?? "bg-surface border border-border text-text-3"}`}
                        >
                          {event.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-text-2">
                          {event._count.eventEntries} entrant
                          {event._count.eventEntries !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </Link>
                    {podium?.first && (
                      <div className="flex gap-6 bg-elevated px-4 py-2 text-xs text-text-2">
                        <span>
                          <span className="mr-1 text-text-3">1st</span>
                          {podium.first.displayName}
                        </span>
                        {podium.second && (
                          <span>
                            <span className="mr-1 text-text-3">2nd</span>
                            {podium.second.displayName}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {yourMatches.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-medium text-text-1">Your matches</h2>
            <YourMatchesList matches={yourMatches} viewerProfileId={viewerProfile!.id} />
          </section>
        )}

        <Link
          href="/tournaments"
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to tournaments
        </Link>
      </div>
    </main>
  );
}
