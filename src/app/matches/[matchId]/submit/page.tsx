import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMatchWithSubmission, isMatchParticipantOrTD } from "@/server/services/match.service";
import { MAX_GAMES } from "@/server/algorithms/match-validation";
import { SubmitResultForm } from "@/components/matches/SubmitResultForm";

type Props = { params: Promise<{ matchId: string }> };

export const metadata = { title: "Submit Result — RallyBase" };

export default async function SubmitResultPage({ params }: Props) {
  const { matchId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const match = await getMatchWithSubmission(matchId);
  if (!match) notFound();

  // Can't submit to a completed or already-awaiting match
  if (match.status === "COMPLETED") {
    redirect(
      `/tournaments/${match.event.tournament.id}/events/${match.event.id}/bracket`,
    );
  }
  if (match.status === "AWAITING_CONFIRMATION") {
    redirect(`/matches/${matchId}/confirm`);
  }

  // Only participants and TDs can access the submit form
  const authorized = await isMatchParticipantOrTD(userId, match);
  if (!authorized) {
    redirect(`/matches/${matchId}/pending`);
  }

  const tournamentId = match.event.tournament.id;
  const eventId = match.event.id;
  const maxGames = MAX_GAMES[match.event.format] ?? 5;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">
          <Link
            href={`/tournaments/${tournamentId}/events/${eventId}/bracket`}
            className="hover:text-text-2"
          >
            {match.event.tournament.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-text-1">Submit match result</h1>
        <p className="text-sm text-text-2">
          {match.player1?.displayName ?? "TBD"} vs {match.player2?.displayName ?? "TBD"}
        </p>
        <p className="text-xs text-text-3">
          {match.event.format.replace("_", " ")} · First to {match.event.gamePointTarget}
        </p>
      </div>

      <SubmitResultForm
        matchId={matchId}
        tournamentId={tournamentId}
        eventId={eventId}
        format={match.event.format}
        maxGames={maxGames}
        player1Name={match.player1?.displayName ?? "Player 1"}
        player2Name={match.player2?.displayName ?? "Player 2"}
        savedScores={match.matchGames}
      />

      <div className="mt-6">
        <Link
          href={`/tournaments/${tournamentId}/events/${eventId}/bracket`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to bracket
        </Link>
      </div>
    </main>
  );
}
