import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail } from "@/server/services/tournament.service";
import { getEventBracket, getRoundRobinStandings } from "@/server/services/bracket.service";
import { tdVoidMatchAction } from "@/server/actions/match.actions";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} Standings — RallyBase` : "Standings not found" };
}

export default async function StandingsPage({ params }: Props) {
  const { id, eventId } = await params;
  const { userId } = await auth();
  const [event, matches, standings] = await Promise.all([
    getEventDetail(eventId),
    getEventBracket(eventId),
    getRoundRobinStandings(eventId),
  ]);

  if (!event) notFound();

  const isTD = !!userId && event.tournament.createdByClerkId === userId;

  // Group matches by round
  const roundMap = new Map<number, typeof matches>();
  for (const m of matches) {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
  }
  const roundNumbers = [...roundMap.keys()].sort((a, b) => a - b);

  const statusLabel: Record<string, string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In progress",
    AWAITING_CONFIRMATION: "Awaiting confirmation",
    COMPLETED: "Completed",
  };

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
          <h1 className="text-2xl font-semibold text-text-1">Standings</h1>
        </div>

        {/* Standings table */}
        {standings.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-medium text-text-1">Current standings</h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-elevated">
                    <th className="px-4 py-2 text-left font-medium text-text-3">#</th>
                    <th className="px-4 py-2 text-left font-medium text-text-3">Player</th>
                    <th className="px-4 py-2 text-right font-medium text-text-3">W</th>
                    <th className="px-4 py-2 text-right font-medium text-text-3">L</th>
                    <th className="px-4 py-2 text-right font-medium text-text-3">Games</th>
                    <th className="px-4 py-2 text-right font-medium text-text-3">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr
                      key={s.playerProfileId}
                      className="border-b border-border-subtle bg-surface last:border-b-0"
                    >
                      <td className="px-4 py-2 text-text-3">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-text-1">
                        <Link
                          href={`/profile/${s.playerProfileId}`}
                          className="hover:text-accent hover:underline"
                        >
                          {s.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right text-accent">{s.wins}</td>
                      <td className="px-4 py-2 text-right text-text-2">{s.losses}</td>
                      <td className="px-4 py-2 text-right text-text-3">
                        {s.gamesWon}–{s.gamesLost}
                      </td>
                      <td className="px-4 py-2 text-right text-text-3">
                        {s.pointsFor}–{s.pointsAgainst}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Match schedule by round */}
        {matches.length === 0 ? (
          <p className="text-sm text-text-2">No matches generated yet.</p>
        ) : (
          <section>
            <h2 className="mb-3 text-lg font-medium text-text-1">Schedule</h2>
            <div className="space-y-6">
              {roundNumbers.map((round) => (
                <div key={round}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-3">
                    Round {round}
                  </p>
                  <ul className="overflow-hidden rounded-lg border border-border">
                    {roundMap.get(round)!.map((match) => (
                      <li
                        key={match.id}
                        className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm ${
                              match.winnerId === match.player1Id
                                ? "font-semibold text-text-1"
                                : "text-text-2"
                            }`}
                          >
                            {match.player1?.displayName ?? "TBD"}
                          </span>
                          <span className="text-xs text-text-3">vs</span>
                          <span
                            className={`text-sm ${
                              match.winnerId === match.player2Id
                                ? "font-semibold text-text-1"
                                : "text-text-2"
                            }`}
                          >
                            {match.player2?.displayName ?? "TBD"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-3">
                            {statusLabel[match.status] ?? match.status}
                          </span>
                          {/* Player actions */}
                          {!isTD && match.status === "PENDING" && match.player1Id && match.player2Id && (
                            <Link
                              href={`/matches/${match.id}/submit`}
                              className="text-xs font-medium text-accent hover:underline"
                            >
                              Submit
                            </Link>
                          )}
                          {!isTD && match.status === "AWAITING_CONFIRMATION" && (
                            <Link
                              href={`/matches/${match.id}/confirm`}
                              className="text-xs font-medium text-accent hover:underline"
                            >
                              Confirm
                            </Link>
                          )}
                          {/* TD actions */}
                          {isTD && (match.status === "PENDING" || match.status === "AWAITING_CONFIRMATION") && match.player1Id && match.player2Id && (
                            <Link
                              href={`/matches/${match.id}/td-submit`}
                              className="text-xs font-medium text-accent hover:underline"
                            >
                              Enter result
                            </Link>
                          )}
                          {isTD && match.status === "COMPLETED" && (
                            <form action={tdVoidMatchAction.bind(null, match.id, id, eventId)}>
                              <button
                                type="submit"
                                className="text-xs font-medium text-red-400 hover:underline"
                              >
                                Void
                              </button>
                            </form>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
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
