import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMatchWithSubmission } from "@/server/services/match.service";
import { MAX_GAMES } from "@/server/algorithms/match-validation";
import { TdSubmitResultForm } from "@/components/matches/TdSubmitResultForm";

type Props = { params: Promise<{ matchId: string }> };

export const metadata = { title: "TD: Record Result — RallyBase" };

export default async function TdSubmitResultPage({ params }: Props) {
  const { matchId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const match = await getMatchWithSubmission(matchId);
  if (!match) notFound();

  // Must be the tournament creator
  if (match.event.tournament.createdByClerkId !== userId) {
    redirect(`/matches/${matchId}/submit`);
  }

  if (match.status === "COMPLETED") {
    redirect(
      `/tournaments/${match.event.tournament.id}/events/${match.event.id}/bracket`,
    );
  }

  const tournamentId = match.event.tournament.id;
  const eventId = match.event.id;
  const maxGames = MAX_GAMES[match.event.format] ?? 5;

  const backHref =
    match.event.eventFormat === "ROUND_ROBIN"
      ? `/tournaments/${tournamentId}/events/${eventId}/standings`
      : `/tournaments/${tournamentId}/events/${eventId}/bracket`;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">
          <Link href={backHref} className="hover:text-text-2">
            {match.event.tournament.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-text-1">Record match result</h1>
        <p className="text-sm text-text-2">
          {match.player1?.displayName ?? "TBD"} vs {match.player2?.displayName ?? "TBD"}
        </p>
        <p className="text-xs text-text-3">
          {match.event.format.replace("_", " ")} · First to {match.event.gamePointTarget}
        </p>
      </div>

      <TdSubmitResultForm
        matchId={matchId}
        tournamentId={tournamentId}
        eventId={eventId}
        format={match.event.format}
        maxGames={maxGames}
        player1Name={match.player1?.displayName ?? "Player 1"}
        player2Name={match.player2?.displayName ?? "Player 2"}
      />

      <div className="mt-6">
        <Link
          href={backHref}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
