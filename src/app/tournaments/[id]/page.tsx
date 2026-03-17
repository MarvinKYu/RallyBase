import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentDetail } from "@/server/services/tournament.service";
import { DeleteTournamentButton } from "@/components/tournaments/DeleteTournamentButton";

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

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-text-3">{tournament.organization.name}</p>
              <h1 className="text-3xl font-semibold text-text-1">{tournament.name}</h1>
            </div>
            {userId && tournament.createdByClerkId === userId && (
              <DeleteTournamentButton tournamentId={tournament.id} />
            )}
          </div>
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
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-1">Events</h2>
            <div className="flex items-center gap-2">
            {tournament.events.length > 0 && (
              <Link
                href={`/tournaments/${id}/register`}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:bg-surface-hover"
              >
                Register for Events
              </Link>
            )}
            {userId && tournament.createdByClerkId === userId && (
              <Link
                href={`/tournaments/${id}/events/new`}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
              >
                Add event
              </Link>
            )}
          </div>
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
