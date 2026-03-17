import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentManageDetail } from "@/server/services/tournament.service";
import {
  advanceTournamentStatusAction,
  advanceEventStatusAction,
} from "@/server/actions/tournament.actions";
import type { TournamentStatus, EventStatus, MatchStatus } from "@prisma/client";

type Props = { params: Promise<{ id: string }> };

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

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  COMPLETED: "Completed",
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

export default async function ManageTournamentPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentManageDetail(id, userId);
  if (!tournament) notFound();

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
            <Link
              href={`/tournaments/${id}/edit`}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:border-accent hover:text-text-1"
            >
              Edit tournament
            </Link>
          </div>

          {TOURNAMENT_ADVANCE_LABELS[tournament.status] && (
            <form action={advanceTournamentStatusAction.bind(null, id)}>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
              >
                {TOURNAMENT_ADVANCE_LABELS[tournament.status]}
              </button>
            </form>
          )}
        </div>

        {/* Events */}
        <section className="space-y-6">
          <h2 className="text-lg font-medium text-text-1">Events</h2>

          {tournament.events.length === 0 ? (
            <p className="text-sm text-text-2">No events yet.</p>
          ) : (
            tournament.events.map((event) => {
              const matchesByRound = event.matches.reduce<
                Record<number, typeof event.matches>
              >((acc, m) => {
                if (!acc[m.round]) acc[m.round] = [];
                acc[m.round].push(m);
                return acc;
              }, {});
              const rounds = Object.keys(matchesByRound)
                .map(Number)
                .sort((a, b) => a - b);

              return (
                <div
                  key={event.id}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  {/* Event header */}
                  <div className="flex items-start justify-between gap-4 border-b border-border bg-elevated px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-text-1">{event.name}</p>
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
                          href={`/tournaments/${id}/events/${event.id}/edit`}
                          className="text-xs text-text-3 transition-colors hover:text-text-1"
                        >
                          Edit
                        </Link>
                        <span className="text-text-3">·</span>
                        {event.eventFormat === "ROUND_ROBIN" ? (
                          <Link
                            href={`/tournaments/${id}/events/${event.id}/standings`}
                            className="text-xs text-text-3 transition-colors hover:text-text-1"
                          >
                            Standings
                          </Link>
                        ) : (
                          <Link
                            href={`/tournaments/${id}/events/${event.id}/bracket`}
                            className="text-xs text-text-3 transition-colors hover:text-text-1"
                          >
                            Bracket
                          </Link>
                        )}
                      </div>
                      {EVENT_ADVANCE_LABELS[event.status] && (
                        <form
                          action={advanceEventStatusAction.bind(null, event.id, id)}
                        >
                          <button
                            type="submit"
                            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
                          >
                            {EVENT_ADVANCE_LABELS[event.status]}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Match list */}
                  <div className="divide-y divide-border-subtle bg-surface">
                    {event.matches.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-text-3">No bracket generated yet.</p>
                    ) : (
                      rounds.map((round) => (
                        <div key={round}>
                          <p className="bg-elevated/50 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-text-3">
                            Round {round}
                          </p>
                          {matchesByRound[round].map((match) => (
                            <div
                              key={match.id}
                              className="flex items-center justify-between px-4 py-2.5"
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm text-text-1">
                                  {match.player1?.displayName ?? "TBD"} vs.{" "}
                                  {match.player2?.displayName ?? "TBD"}
                                </p>
                                <ScoreSummary games={match.matchGames} />
                              </div>
                              <span
                                className={`text-xs ${
                                  match.status === "COMPLETED"
                                    ? "text-text-3"
                                    : "text-text-2"
                                }`}
                              >
                                {MATCH_STATUS_LABELS[match.status]}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to tournament
        </Link>
      </div>
    </main>
  );
}
