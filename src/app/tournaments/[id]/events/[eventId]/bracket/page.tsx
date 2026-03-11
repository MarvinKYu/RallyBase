import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventDetail } from "@/server/services/tournament.service";
import { getEventBracket } from "@/server/services/bracket.service";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} Bracket — RallyBase` : "Bracket not found" };
}

// Match card height in px — used to compute round spacing
const MATCH_H = 80;

type BracketMatch = Awaited<ReturnType<typeof getEventBracket>>[number];

function MatchCard({ match }: { match: BracketMatch }) {
  const isBye = match.player2Id === null && match.status === "COMPLETED";
  const isActionable =
    match.status === "PENDING" || match.status === "AWAITING_CONFIRMATION";

  const rowClass = (isWinner: boolean) =>
    [
      "flex items-center justify-between px-3 py-1.5 text-sm",
      isWinner ? "font-semibold text-zinc-900" : "text-zinc-500",
    ].join(" ");

  const p1 = match.player1?.displayName ?? "TBD";
  const p2 = match.player2?.displayName ?? (isBye ? "BYE" : "TBD");
  const p1Wins = match.winnerId === match.player1Id;
  const p2Wins = match.winnerId === match.player2Id;

  const cardHeight = isActionable ? MATCH_H + 24 : MATCH_H;

  return (
    <div
      className="w-44 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm"
      style={{ height: cardHeight }}
    >
      <div className={rowClass(p1Wins)}>
        <span className="truncate">{p1}</span>
        {p1Wins && <span className="ml-1 text-xs text-green-600">W</span>}
      </div>
      <div className="border-t border-zinc-100" />
      <div className={rowClass(p2Wins)}>
        <span className={`truncate ${isBye ? "italic text-zinc-300" : ""}`}>{p2}</span>
        {p2Wins && <span className="ml-1 text-xs text-green-600">W</span>}
      </div>
      <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-3 py-1">
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
          {isBye ? "bye" : match.status.toLowerCase().replace(/_/g, " ")}
        </span>
        {match.status === "PENDING" && match.player1Id && match.player2Id && (
          <Link
            href={`/matches/${match.id}/submit`}
            className="text-[10px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            Submit
          </Link>
        )}
        {match.status === "AWAITING_CONFIRMATION" && (
          <Link
            href={`/matches/${match.id}/confirm`}
            className="text-[10px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            Confirm
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function BracketPage({ params }: Props) {
  const { id, eventId } = await params;
  const [event, matches] = await Promise.all([
    getEventDetail(eventId),
    getEventBracket(eventId),
  ]);

  if (!event) notFound();

  if (matches.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm text-zinc-500">No bracket generated yet.</p>
        <Link
          href={`/tournaments/${id}/events/${eventId}`}
          className="mt-4 inline-block text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back to event
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
        <p className="text-sm text-zinc-400">
          <Link href={`/tournaments/${id}`} className="hover:text-zinc-700">
            {event.tournament.name}
          </Link>
          {" / "}
          <Link href={`/tournaments/${id}/events/${eventId}`} className="hover:text-zinc-700">
            {event.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">Bracket</h1>
      </div>

      {/* Bracket columns */}
      <div className="flex items-start gap-10 overflow-x-auto pb-8">
        {roundNumbers.map((round) => {
          const roundMatches = roundMap.get(round)!;
          // Calculate spacing so matches align with their R1 feeders
          const factor = Math.pow(2, round - 1);
          const paddingTop = ((factor - 1) * MATCH_H) / 2;
          const gap = (factor - 1) * MATCH_H;

          return (
            <div key={round} className="flex shrink-0 flex-col">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
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
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href={`/tournaments/${id}/events/${eventId}`}
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        ← Back to event
      </Link>
    </main>
  );
}
