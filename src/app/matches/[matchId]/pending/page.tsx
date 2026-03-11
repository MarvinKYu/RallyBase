import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMatchWithSubmission } from "@/server/services/match.service";

type Props = { params: Promise<{ matchId: string }> };

export const metadata = { title: "Awaiting Confirmation — RallyBase" };

export default async function PendingResultPage({ params }: Props) {
  const { matchId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const match = await getMatchWithSubmission(matchId);
  if (!match) notFound();

  const submission = match.submissions[0];
  if (!submission) {
    redirect(`/matches/${matchId}/submit`);
  }

  const tournamentId = match.event.tournament.id;
  const eventId = match.event.id;

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
        <h1 className="text-2xl font-semibold text-zinc-900">Result submitted</h1>
        <p className="text-sm text-zinc-500">
          {match.player1?.displayName ?? "Player 1"} vs{" "}
          {match.player2?.displayName ?? "Player 2"}
        </p>
      </div>

      {/* Confirmation code — shown prominently for the submitter to read aloud */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-5 text-center">
        <p className="mb-2 text-sm font-medium text-zinc-500">
          Give this code to your opponent to confirm the result
        </p>
        <p className="break-all font-mono text-lg font-semibold tracking-wide text-zinc-900">
          {submission.confirmationCode}
        </p>
      </div>

      {/* Submitted scores */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">Submitted scores</h2>
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
        <p className="mt-2 text-xs text-zinc-400">
          Submitted by {submission.submittedBy.displayName}
        </p>
      </section>

      <div className="space-y-3">
        <Link
          href={`/matches/${matchId}/confirm`}
          className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Go to confirmation page →
        </Link>
        <Link
          href={`/tournaments/${tournamentId}/events/${eventId}/bracket`}
          className="block text-center text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back to bracket
        </Link>
      </div>
    </main>
  );
}
