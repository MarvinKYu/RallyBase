import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentManageDetail } from "@/server/services/tournament.service";
import { getEventPodium, type EventPodium } from "@/server/services/bracket.service";
import type { TournamentStatus, EventStatus } from "@prisma/client";
import { EventMatchList } from "@/components/tournaments/EventMatchList";
import { AdvanceTournamentStatusButton } from "@/components/tournaments/AdvanceTournamentStatusButton";
import { AdvanceEventStatusButton } from "@/components/tournaments/AdvanceEventStatusButton";
import { DeleteTournamentButton } from "@/components/tournaments/DeleteTournamentButton";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return { title: "Manage Tournament — RallyBase" };
  const t = await getTournamentManageDetail(id, userId);
  return { title: t ? `Manage ${t.name} — RallyBase` : "Tournament not found" };
}

const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Registration Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const TOURNAMENT_ADVANCE_LABELS: Partial<Record<TournamentStatus, string>> = {
  DRAFT: "Publish",
  PUBLISHED: "Start Tournament",
  IN_PROGRESS: "Complete Tournament",
};

const EVENT_ADVANCE_LABELS: Partial<Record<EventStatus, string>> = {
  DRAFT: "Open Registration",
  REGISTRATION_OPEN: "Start Event",
  IN_PROGRESS: "Complete Event",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  DRAFT: "bg-surface border border-border text-text-3",
  PUBLISHED: "bg-blue-950/60 border border-blue-800 text-blue-300",
  REGISTRATION_OPEN: "bg-green-950/60 border border-green-800 text-green-300",
  IN_PROGRESS: "bg-amber-950/60 border border-amber-800 text-amber-300",
  COMPLETED: "bg-surface border border-border text-text-2",
};

function StatusBadge({ status }: { status: string }) {
  const label =
    (TOURNAMENT_STATUS_LABELS as Record<string, string>)[status] ??
    (EVENT_STATUS_LABELS as Record<string, string>)[status] ??
    status;
  const classes = STATUS_BADGE_CLASSES[status] ?? "bg-surface border border-border text-text-3";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

export default async function ManageTournamentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { from } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentManageDetail(id, userId);
  if (!tournament) notFound();

  const completedEvents = tournament.events.filter((e) => e.status === "COMPLETED");
  const podiumResults = await Promise.all(
    completedEvents.map((e) => getEventPodium(e.id, e.eventFormat, e.groupSize)),
  );
  const podiumMap = new Map<string, EventPodium>(
    completedEvents.map((e, i) => [e.id, podiumResults[i]]),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-10">
        {/* Tournament header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-text-3">{tournament.organization.name}</p>
              <h1 className="text-2xl font-semibold text-text-1">{tournament.name}</h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={tournament.status} />
                <span className="text-sm text-text-3">
                  {new Date(tournament.startDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/tournaments/${id}/edit`}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:border-accent hover:text-text-1"
              >
                Edit tournament
              </Link>
              <DeleteTournamentButton tournamentId={id} />
            </div>
          </div>

          {TOURNAMENT_ADVANCE_LABELS[tournament.status] && (
            <AdvanceTournamentStatusButton
              tournamentId={id}
              label={TOURNAMENT_ADVANCE_LABELS[tournament.status]!}
            />
          )}
        </div>

        {/* Events */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-1">Events</h2>
            <Link
              href={`/tournaments/${id}/events/new`}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:border-accent hover:text-text-1"
            >
              Add event
            </Link>
          </div>

          {tournament.events.length === 0 ? (
            <p className="text-sm text-text-2">No events yet.</p>
          ) : (
            tournament.events.map((event) => {
              const podium = podiumMap.get(event.id);
              return (
                <div
                  key={event.id}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  {/* Event header */}
                  <div className="flex items-start justify-between gap-4 border-b border-border bg-elevated px-4 py-3">
                    <div className="space-y-1">
                      <Link
                        href={`/tournaments/${id}/events/${event.id}/manage`}
                        className="font-medium text-text-1 hover:underline"
                      >
                        {event.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={event.status} />
                        <span className="text-xs text-text-3">
                          {event._count.eventEntries} entrant
                          {event._count.eventEntries !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tournaments/${id}/events/${event.id}/manage`}
                          className="text-xs text-text-3 transition-colors hover:text-text-1"
                        >
                          Manage
                        </Link>
                        <span className="text-text-3">·</span>
                        {event.eventFormat === "ROUND_ROBIN" ? (
                          <Link
                            href={`/tournaments/${id}/events/${event.id}/standings?from=manage`}
                            className="text-xs text-text-3 transition-colors hover:text-text-1"
                          >
                            Standings
                          </Link>
                        ) : (
                          <Link
                            href={`/tournaments/${id}/events/${event.id}/bracket?from=manage`}
                            className="text-xs text-text-3 transition-colors hover:text-text-1"
                          >
                            Bracket
                          </Link>
                        )}
                      </div>
                      {EVENT_ADVANCE_LABELS[event.status] && (
                        <AdvanceEventStatusButton
                          eventId={event.id}
                          tournamentId={id}
                          label={EVENT_ADVANCE_LABELS[event.status]!}
                        />
                      )}
                    </div>
                  </div>

                  {/* Podium row (completed events) */}
                  {podium?.first && (
                    <div className="flex items-center gap-4 border-b border-border-subtle bg-elevated px-4 py-2 text-xs text-text-2">
                      <span>
                        <span className="mr-1.5 text-text-3">1st</span>
                        <Link href={`/profile/${podium.first.id}`} className="text-text-1 hover:underline">
                          {podium.first.displayName}
                        </Link>
                      </span>
                      {podium.second && (
                        <span>
                          <span className="mr-1.5 text-text-3">2nd</span>
                          <Link href={`/profile/${podium.second.id}`} className="hover:underline">
                            {podium.second.displayName}
                          </Link>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Match list */}
                  <EventMatchList
                    matches={event.matches}
                    eventFormat={event.eventFormat}
                    groupSize={event.groupSize}
                  />
                </div>
              );
            })
          )}
        </section>

        {from === "admin" ? (
          <Link
            href="/admin/tournaments"
            className="text-sm text-text-2 transition-colors hover:text-text-1"
          >
            ← Admin Tournaments
          </Link>
        ) : (
          <Link
            href="/tournament-directors"
            className="text-sm text-text-2 transition-colors hover:text-text-1"
          >
            ← Back to Tournament Directors
          </Link>
        )}
      </div>
    </main>
  );
}
