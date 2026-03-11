import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMatchWithSubmission } from "@/server/services/match.service";
import { ConfirmResultForm } from "@/components/matches/ConfirmResultForm";

type Props = { params: Promise<{ matchId: string }> };

export const metadata = { title: "Confirm Result — RallyBase" };

export default async function ConfirmResultPage({ params }: Props) {
  const { matchId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const match = await getMatchWithSubmission(matchId);
  if (!match) notFound();

  const tournamentId = match.event.tournament.id;
  const eventId = match.event.id;

  if (match.status === "COMPLETED") {
    redirect(`/tournaments/${tournamentId}/events/${eventId}/bracket`);
  }
  if (match.status !== "AWAITING_CONFIRMATION") {
    redirect(`/matches/${matchId}/submit`);
  }

  const submission = match.submissions[0]!;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-zinc-400">
          <Link
            href={`/tournaments/${tournamentId}/events/${eventId}/bracket`}
            className="hover:text-zinc-700"
          >
            {match.event.tournament.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">Confirm match result</h1>
        <p className="text-sm text-zinc-500">
          {match.player1?.displayName ?? "Player 1"} vs{" "}
          {match.player2?.displayName ?? "Player 2"}
        </p>
      </div>

      {/* Scores to review */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Scores submitted by {submission.submittedBy.displayName}
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <div className="grid grid-cols-[2rem_1fr_1fr] gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <span>#</span>
            <span className="truncate">{match.player1?.displayName ?? "Player 1"}</span>
            <span className="truncate">{match.player2?.displayName ?? "Player 2"}</span>
          </div>
          {submission.games.map((g) => (
            <div
              key={g.gameNumber}
              className="grid grid-cols-[2rem_1fr_1fr] gap-4 border-b border-zinc-100 px-4 py-3 last:border-b-0"
            >
              <span className="text-sm text-zinc-400">{g.gameNumber}</span>
              <span className="text-sm font-medium text-zinc-900">{g.player1Points}</span>
              <span className="text-sm font-medium text-zinc-900">{g.player2Points}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Confirmation code entry */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Enter the confirmation code to confirm these scores
        </h2>
        <ConfirmResultForm
          matchId={matchId}
          tournamentId={tournamentId}
          eventId={eventId}
        />
      </div>

      <Link
        href={`/tournaments/${tournamentId}/events/${eventId}/bracket`}
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        ← Back to bracket
      </Link>
    </main>
  );
}
