import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMatchWithSubmission } from "@/server/services/match.service";
import { MAX_GAMES } from "@/server/algorithms/match-validation";
import { TdSubmitResultForm } from "@/components/matches/TdSubmitResultForm";
import { tdDefaultMatchAction } from "@/server/actions/match.actions";
import { isAuthorizedAsTD } from "@/server/services/admin.service";

type Props = {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export const metadata = { title: "TD: Record Result — RallyBase" };

export default async function TdSubmitResultPage({ params, searchParams }: Props) {
  const { matchId } = await params;
  const { returnTo } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const match = await getMatchWithSubmission(matchId);
  if (!match) notFound();

  // Must be the tournament creator
  if (!(await isAuthorizedAsTD(userId, match.event.tournament))) {
    redirect(`/matches/${matchId}/submit`);
  }

  const tournamentId = match.event.tournament.id;
  const eventId = match.event.id;

  // Determine where "back" goes based on format and match phase
  const isRRPhaseMatch =
    match.event.eventFormat === "ROUND_ROBIN" ||
    (match.event.eventFormat === "RR_TO_SE" && match.groupNumber !== null);
  const defaultBackHref = isRRPhaseMatch
    ? match.event.eventFormat === "ROUND_ROBIN"
      ? `/tournaments/${tournamentId}/events/${eventId}/standings`
      : `/tournaments/${tournamentId}/events/${eventId}/manage`
    : `/tournaments/${tournamentId}/events/${eventId}/bracket`;
  // Use returnTo if it's a valid internal path (starts with /), else fall back
  const backHref = returnTo && returnTo.startsWith("/") ? returnTo : defaultBackHref;

  if (match.status === "COMPLETED") {
    redirect(backHref);
  }

  const isRRMatch = match.groupNumber !== null && !!match.event.rrFormat;
  const effectiveFormat = isRRMatch ? match.event.rrFormat! : match.event.format;
  const effectivePointTarget = isRRMatch
    ? (match.event.rrGamePointTarget ?? match.event.gamePointTarget)
    : match.event.gamePointTarget;
  const maxGames = MAX_GAMES[effectiveFormat] ?? 5;
  const player1Id = match.player1Id!;
  const player2Id = match.player2Id!;

  const initialScores =
    match.submissions[0]?.games.length
      ? match.submissions[0].games
      : match.matchGames.length
        ? match.matchGames
        : undefined;

  const defaultWinP1 = tdDefaultMatchAction.bind(null, matchId, tournamentId, eventId, player1Id, backHref);
  const defaultWinP2 = tdDefaultMatchAction.bind(null, matchId, tournamentId, eventId, player2Id, backHref);

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
          {effectiveFormat.replace("_", " ")} · First to {effectivePointTarget}
        </p>
      </div>

      <TdSubmitResultForm
        matchId={matchId}
        tournamentId={tournamentId}
        eventId={eventId}
        format={effectiveFormat}
        redirectTo={backHref}
        maxGames={maxGames}
        player1Name={match.player1?.displayName ?? "Player 1"}
        player2Name={match.player2?.displayName ?? "Player 2"}
        initialScores={initialScores}
      />

      {/* Record by default */}
      <div className="mt-8 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-medium text-text-1">Record by default</h2>
        <p className="mb-4 text-xs text-text-3">
          No scores recorded. Ratings are not affected.
        </p>
        <div className="flex gap-3">
          <form action={defaultWinP1}>
            <button
              type="submit"
              className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-1 transition-colors hover:border-accent hover:text-accent"
            >
              {match.player1?.displayName ?? "Player 1"} wins by default
            </button>
          </form>
          <form action={defaultWinP2}>
            <button
              type="submit"
              className="rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-1 transition-colors hover:border-accent hover:text-accent"
            >
              {match.player2?.displayName ?? "Player 2"} wins by default
            </button>
          </form>
        </div>
      </div>

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
