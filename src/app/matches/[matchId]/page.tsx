import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getMatchWithSubmission } from "@/server/services/match.service";

type Props = { params: Promise<{ matchId: string }> };

export async function generateMetadata({ params }: Props) {
  const { matchId } = await params;
  const match = await getMatchWithSubmission(matchId);
  if (!match) return { title: "Match not found" };
  const p1 = match.player1?.displayName ?? "Player 1";
  const p2 = match.player2?.displayName ?? "Player 2";
  return { title: `${p1} vs ${p2} — RallyBase` };
}

export default async function MatchResultPage({ params }: Props) {
  const { matchId } = await params;
  const match = await getMatchWithSubmission(matchId);
  if (!match) notFound();

  if (match.status === "AWAITING_CONFIRMATION") {
    redirect(`/matches/${matchId}/pending`);
  }
  if (match.status === "PENDING") {
    redirect(`/matches/${matchId}/submit`);
  }
  if (match.status !== "COMPLETED" && match.status !== "IN_PROGRESS") {
    redirect(`/matches/${matchId}/submit`);
  }

  const tournamentId = match.event.tournament.id;
  const eventId = match.event.id;

  const p1 = match.player1?.displayName ?? "Player 1";
  const p2 = match.player2?.displayName ?? "Player 2";
  const winner = match.winner?.displayName ?? null;
  const isInProgress = match.status === "IN_PROGRESS";

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">
          <Link href={`/tournaments/${tournamentId}`} className="hover:text-text-2">
            {match.event.tournament.name}
          </Link>
          {" / "}
          <Link
            href={`/tournaments/${tournamentId}/events/${eventId}/bracket`}
            className="hover:text-text-2"
          >
            Bracket
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-text-1">{p1} vs {p2}</h1>
        {isInProgress ? (
          <p className="text-base font-medium text-amber-400">Match in progress</p>
        ) : (
          winner && <p className="text-base font-medium text-accent">{winner} won</p>
        )}
      </div>

      {/* Per-game score table */}
      {match.matchGames.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-text-2">
            {isInProgress ? "Saved scores" : "Game scores"}
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[2rem_1fr_1fr] gap-4 border-b border-border-subtle bg-elevated px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-3">
              <span>#</span>
              <span className="truncate">{p1}</span>
              <span className="truncate">{p2}</span>
            </div>
            {match.matchGames.map((g) => (
              <div
                key={g.gameNumber}
                className="grid grid-cols-[2rem_1fr_1fr] gap-4 border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-text-3">{g.gameNumber}</span>
                <span
                  className={`text-sm ${
                    g.player1Points > g.player2Points
                      ? "font-medium text-text-1"
                      : "text-text-2"
                  }`}
                >
                  {g.player1Points}
                </span>
                <span
                  className={`text-sm ${
                    g.player2Points > g.player1Points
                      ? "font-medium text-text-1"
                      : "text-text-2"
                  }`}
                >
                  {g.player2Points}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Link
        href={`/tournaments/${tournamentId}/events/${eventId}/bracket`}
        className="text-sm text-text-2 transition-colors hover:text-text-1"
      >
        ← Back to bracket
      </Link>
    </main>
  );
}
