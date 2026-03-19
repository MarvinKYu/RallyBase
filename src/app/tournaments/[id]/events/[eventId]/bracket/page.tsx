import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail } from "@/server/services/tournament.service";
import { getEventBracket } from "@/server/services/bracket.service";
import { tdVoidMatchAction } from "@/server/actions/match.actions";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} Bracket — RallyBase` : "Bracket not found" };
}

// Card height constants — all cards render at CARD_H regardless of actionability
// to keep spacing uniform across rounds.
const MATCH_H = 80;
const ACTIONS_H = 24;
const CARD_H = MATCH_H + ACTIONS_H; // effective card height for spacing

type BracketMatch = Awaited<ReturnType<typeof getEventBracket>>[number];

function MatchCard({
  match,
  tournamentId,
  eventId,
  isTD,
}: {
  match: BracketMatch;
  tournamentId: string;
  eventId: string;
  isTD: boolean;
}) {
  const isBye = match.player2Id === null && match.status === "COMPLETED";

  const rowClass = (isWinner: boolean) =>
    [
      "flex items-center justify-between px-3 py-1.5 text-sm",
      isWinner ? "font-semibold text-text-1" : "text-text-2",
    ].join(" ");

  const p1 = match.player1?.displayName ?? "TBD";
  const p2 = match.player2?.displayName ?? (isBye ? "BYE" : "TBD");
  const p1Wins = match.winnerId === match.player1Id;
  const p2Wins = match.winnerId === match.player2Id;

  const p1GameWins = match.status === "COMPLETED"
    ? match.matchGames.filter((g) => g.player1Points > g.player2Points).length
    : null;
  const p2GameWins = match.status === "COMPLETED"
    ? match.matchGames.filter((g) => g.player2Points > g.player1Points).length
    : null;

  return (
    <div
      className="w-44 overflow-hidden rounded-md border border-border bg-surface shadow-sm"
      style={{ height: CARD_H }}
    >
      <div className={rowClass(p1Wins)}>
        <span className="truncate">{p1}</span>
        <span className="ml-1 shrink-0 text-xs">
          {p1GameWins !== null && <span className="text-text-3">· {p1GameWins}</span>}
          {p1Wins && <span className="ml-1 text-accent">W</span>}
        </span>
      </div>
      <div className="border-t border-border-subtle" />
      <div className={rowClass(p2Wins)}>
        <span className={`truncate ${isBye ? "italic text-text-3" : ""}`}>{p2}</span>
        <span className="ml-1 shrink-0 text-xs">
          {p2GameWins !== null && <span className="text-text-3">· {p2GameWins}</span>}
          {p2Wins && <span className="ml-1 text-accent">W</span>}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border-subtle bg-elevated px-3 py-1">
        <span className="text-[10px] uppercase tracking-wide text-text-3">
          {isBye ? "bye" : match.status.toLowerCase().replace(/_/g, " ")}
        </span>
        <div className="flex gap-2">
          {/* Player actions */}
          {!isTD && match.status === "PENDING" && match.player1Id && match.player2Id && (
            <Link
              href={`/matches/${match.id}/submit`}
              className="text-[10px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Submit
            </Link>
          )}
          {!isTD && match.status === "AWAITING_CONFIRMATION" && (
            <>
              <Link
                href={`/matches/${match.id}/pending`}
                className="text-[10px] font-medium text-text-3 underline-offset-2 hover:text-accent hover:underline"
              >
                Code
              </Link>
              <Link
                href={`/matches/${match.id}/confirm`}
                className="text-[10px] font-medium text-text-3 underline-offset-2 hover:text-accent hover:underline"
              >
                Confirm
              </Link>
            </>
          )}
          {/* TD actions */}
          {isTD && (match.status === "PENDING" || match.status === "AWAITING_CONFIRMATION") && match.player1Id && match.player2Id && (
            <Link
              href={`/matches/${match.id}/td-submit`}
              className="text-[10px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Enter result
            </Link>
          )}
          {isTD && (match.status === "COMPLETED" || match.status === "AWAITING_CONFIRMATION") && !isBye && (
            <form action={tdVoidMatchAction.bind(null, match.id, tournamentId, eventId)} className="flex items-center">
              <button
                type="submit"
                className="text-[10px] font-medium text-red-400 underline-offset-2 hover:underline"
              >
                Void
              </button>
            </form>
          )}
          {match.status === "COMPLETED" && !isBye && (
            <Link
              href={`/matches/${match.id}`}
              className="text-[10px] font-medium text-text-3 underline-offset-2 hover:text-accent hover:underline"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function BracketPage({ params, searchParams }: Props) {
  const { id, eventId } = await params;
  const { from } = await searchParams;
  const { userId } = await auth();
  const [event, matches] = await Promise.all([
    getEventDetail(eventId),
    getEventBracket(eventId),
  ]);

  if (!event) notFound();
  if (event.eventFormat === "ROUND_ROBIN") {
    redirect(`/tournaments/${id}/events/${eventId}/standings${from ? `?from=${from}` : ""}`);
  }

  const isTD = !!userId && event.tournament.createdByClerkId === userId;

  if (matches.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm text-text-2">No bracket generated yet.</p>
        <Link
          href={
            from === "manage"
              ? `/tournaments/${id}/events/${eventId}/manage`
              : `/tournaments/${id}/events/${eventId}`
          }
          className="mt-4 inline-block text-sm text-text-2 hover:text-text-1"
        >
          {from === "manage" ? "← Back to manage event" : "← Back to event"}
        </Link>
      </main>
    );
  }

  // Group matches by round
  const roundMap = new Map<number, BracketMatch[]>();
  for (const m of matches) {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
  }
  const roundNumbers = [...roundMap.keys()].sort((a, b) => a - b);
  const totalRounds = roundNumbers[roundNumbers.length - 1];

  // Round label helper
  function roundLabel(round: number): string {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semifinal";
    if (round === totalRounds - 2) return "Quarterfinal";
    return `Round ${round}`;
  }

  return (
    <main className="px-6 py-12">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">
          <Link href={`/tournaments/${id}`} className="hover:text-text-2">
            {event.tournament.name}
          </Link>
          {" / "}
          <Link href={`/tournaments/${id}/events/${eventId}`} className="hover:text-text-2">
            {event.name}
          </Link>
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-1">Bracket</h1>
          {isTD && (
            <span className="rounded-md border border-accent/30 px-2 py-0.5 text-xs text-accent">
              TD view
            </span>
          )}
        </div>
      </div>

      {/* Bracket columns */}
      <div className="flex items-start gap-10 overflow-x-auto pb-8">
        {roundNumbers.map((round) => {
          const roundMatches = roundMap.get(round)!;
          // Calculate spacing so matches align with their R1 feeders
          const factor = Math.pow(2, round - 1);
          const paddingTop = ((factor - 1) * CARD_H) / 2;
          const gap = (factor - 1) * CARD_H;

          return (
            <div key={round} className="flex shrink-0 flex-col">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-3">
                {roundLabel(round)}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  paddingTop,
                  gap,
                }}
              >
                {roundMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tournamentId={id}
                    eventId={eventId}
                    isTD={isTD}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href={
          from === "manage"
            ? `/tournaments/${id}/events/${eventId}/manage`
            : `/tournaments/${id}/events/${eventId}`
        }
        className="text-sm text-text-2 transition-colors hover:text-text-1"
      >
        {from === "manage" ? "← Back to manage event" : "← Back to event"}
      </Link>
    </main>
  );
}
