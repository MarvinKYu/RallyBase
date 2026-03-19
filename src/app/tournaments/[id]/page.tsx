import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentDetail } from "@/server/services/tournament.service";
import {
  getMyProfile,
  getPlayerMatchesForTournament,
} from "@/server/services/player.service";
import { findMatchesByPlayerAndTournament } from "@/server/repositories/match.repository";

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

type PlayerMatch = Awaited<ReturnType<typeof findMatchesByPlayerAndTournament>>[number];

const MATCH_STATUS_LABEL: Record<string, string> = {
  PENDING: "Upcoming",
  IN_PROGRESS: "In progress",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  COMPLETED: "Completed",
};

function YourMatchesList({
  matches,
  viewerProfileId,
}: {
  matches: PlayerMatch[];
  viewerProfileId: string;
}) {
  const inProgress = matches.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "AWAITING_CONFIRMATION",
  );
  const upcoming = matches.filter((m) => m.status === "PENDING");
  const completed = matches.filter((m) => m.status === "COMPLETED");

  const groups = [
    { label: "In progress", items: inProgress },
    { label: "Upcoming", items: upcoming },
    { label: "Completed", items: completed },
  ];

  return (
    <div className="space-y-4">
      {groups.map(({ label, items }) =>
        items.length === 0 ? null : (
          <div key={label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">
              {label}
            </p>
            <ul className="overflow-hidden rounded-lg border border-border">
              {items.map((m) => {
                const opponent =
                  m.player1Id === viewerProfileId ? m.player2 : m.player1;
                const actionHref =
                  m.status === "AWAITING_CONFIRMATION"
                    ? `/matches/${m.id}/confirm`
                    : m.status === "COMPLETED" || m.status === "IN_PROGRESS"
                      ? `/matches/${m.id}/pending`
                      : `/matches/${m.id}/submit`;
                const actionLabel =
                  m.status === "PENDING"
                    ? "Submit"
                    : m.status === "AWAITING_CONFIRMATION"
                      ? "Confirm"
                      : "View";

                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-1">
                        {m.event.name} · Round {m.round} vs{" "}
                        {opponent?.displayName ?? "TBD"}
                      </p>
                      <p className="text-xs text-text-3">
                        {MATCH_STATUS_LABEL[m.status] ?? m.status}
                      </p>
                    </div>
                    <Link
                      href={actionHref}
                      className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
                    >
                      {actionLabel}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  // Draft guard: only the creator can view a draft
  if (tournament.status === "DRAFT" && tournament.createdByClerkId !== userId) {
    redirect("/tournaments");
  }

  const viewerProfile = userId ? await getMyProfile() : null;
  const yourMatches = viewerProfile
    ? await getPlayerMatchesForTournament(viewerProfile.id, tournament.id)
    : [];

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
              {tournament.events.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/tournaments/${id}/events/${event.id}`}
                    className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-1">{event.name}</p>
                      <p className="text-xs text-text-3">
                        {event.ratingCategory.name} · {formatLabel[event.format] ?? event.format}
                      </p>
                    </div>
                    <p className="text-xs text-text-2">
                      {event._count.eventEntries} entrant
                      {event._count.eventEntries !== 1 ? "s" : ""}
                    </p>
                  </Link>
                </li>
              ))}
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
