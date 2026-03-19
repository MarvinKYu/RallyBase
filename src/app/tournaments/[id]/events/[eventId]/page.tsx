import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventDetail } from "@/server/services/tournament.service";
import { bracketExists } from "@/server/services/bracket.service";

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

const formatLabel: Record<string, string> = {
  BEST_OF_3: "Best of 3",
  BEST_OF_5: "Best of 5",
  BEST_OF_7: "Best of 7",
};

const statusBadgeClass: Record<string, string> = {
  DRAFT: "text-text-3",
  REGISTRATION_OPEN: "text-accent",
  IN_PROGRESS: "text-yellow-400",
  COMPLETED: "text-text-3",
};

export default async function EventDetailPage({ params }: Props) {
  const { id, eventId } = await params;

  const [event, hasBracket] = await Promise.all([
    getEventDetail(eventId),
    bracketExists(eventId),
  ]);
  if (!event) notFound();

  const isRoundRobin = event.eventFormat === "ROUND_ROBIN";

  const eligibilityLines: string[] = [];
  if (event.maxParticipants) eligibilityLines.push(`Max ${event.maxParticipants} players`);
  if (event.minRating) eligibilityLines.push(`Min rating: ${Math.round(event.minRating)}`);
  if (event.maxRating) eligibilityLines.push(`Max rating: ${Math.round(event.maxRating)}`);
  if (event.minAge) eligibilityLines.push(`Min age: ${event.minAge}`);
  if (event.maxAge) eligibilityLines.push(`Max age: ${event.maxAge}`);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-text-3">
            <Link href={`/tournaments/${id}`} className="transition-colors hover:text-text-2">
              {event.tournament.name}
            </Link>
          </p>
          <h1 className="text-3xl font-semibold text-text-1">{event.name}</h1>
          <p className="mt-1 text-sm text-text-2">
            {event.ratingCategory.name} ·{" "}
            {isRoundRobin ? "Round Robin" : "Single Elimination"} ·{" "}
            {formatLabel[event.format] ?? event.format} · First to {event.gamePointTarget}
          </p>
          {(event as { startTime?: Date | null }).startTime && (
            <p className="mt-1 text-sm text-text-3">
              Starts {new Date((event as { startTime: Date }).startTime).toLocaleString()}
            </p>
          )}
          {eligibilityLines.length > 0 && (
            <p className="mt-1 text-xs text-text-3">{eligibilityLines.join(" · ")}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs font-medium ${statusBadgeClass[event.status] ?? "text-text-3"}`}>
              {event.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {hasBracket && !isRoundRobin && (
              <Link
                href={`/tournaments/${id}/events/${eventId}/bracket`}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
              >
                View bracket
              </Link>
            )}
            {(hasBracket || isRoundRobin) && (
              <Link
                href={`/tournaments/${id}/events/${eventId}/standings`}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isRoundRobin
                    ? "bg-accent text-background hover:bg-accent-dim"
                    : "border border-border text-text-2 hover:bg-surface-hover"
                }`}
              >
                {isRoundRobin ? "View standings" : "Standings"}
              </Link>
            )}
          </div>
        </div>

        {/* Entrants */}
        <section>
          <h2 className="mb-4 text-lg font-medium text-text-1">
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
    </main>
  );
}
