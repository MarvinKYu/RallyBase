import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventDetail } from "@/server/services/tournament.service";
import { getEventBracket } from "@/server/services/bracket.service";
import { EventMatchRow, type SerializedEventMatch } from "@/components/tournaments/EventMatchRow";
import { RRtoSEMatchesList } from "@/components/tournaments/RRtoSEMatchesList";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `Matches — ${event.name} — RallyBase` : "Event not found" };
}

export default async function EventMatchesPage({ params }: Props) {
  const { id, eventId } = await params;

  const [event, rawMatches] = await Promise.all([
    getEventDetail(eventId),
    getEventBracket(eventId),
  ]);
  if (!event) notFound();

  const matches: SerializedEventMatch[] = rawMatches.map((m) => ({
    id: m.id,
    round: m.round,
    groupNumber: m.groupNumber,
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div>
          <p className="text-sm text-text-3">
            <Link
              href={`/tournaments/${id}/events/${eventId}`}
              className="transition-colors hover:text-text-2"
            >
              {event.name}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-text-1">
            Matches ({matches.length})
          </h1>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-text-2">No matches scheduled yet.</p>
        ) : event.eventFormat === "RR_TO_SE" ? (
          <RRtoSEMatchesList matches={matches} />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border">
            {matches.map((m) => (
              <EventMatchRow key={m.id} match={m} />
            ))}
          </ul>
        )}

        <Link
          href={`/tournaments/${id}/events/${eventId}`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to event
        </Link>
      </div>
    </main>
  );
}
