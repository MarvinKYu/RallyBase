import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail } from "@/server/services/tournament.service";
import { getEventBracket } from "@/server/services/bracket.service";
import { tdVoidMatchAction } from "@/server/actions/match.actions";
import { getRoundLabel } from "@/lib/bracket-labels";
import { bracketSeedOrder } from "@/server/algorithms/bracket";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} Bracket — RallyBase` : "Bracket not found" };
}

// ── Layout constants ──────────────────────────────────────────────────────────

const MATCH_H = 80;
const ACTIONS_H = 24;
const CARD_H = MATCH_H + ACTIONS_H; // 104px — effective card height for spacing
const CARD_W = 176;                  // w-44
const CONN_W = 40;                   // width of SVG connector columns
const LABEL_H = 28;                  // height reserved above cards for round labels

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** y-center (px) of the local-index-i match (0-based) in a given round */
function yCenter(round: number, localIndex: number): number {
  const factor = Math.pow(2, round - 1);
  const pt = ((factor - 1) * CARD_H) / 2;
  const gap = (factor - 1) * CARD_H;
  return pt + localIndex * (CARD_H + gap) + CARD_H / 2;
}

/** Total pixel height of one bracket half (left or right side) */
function halfHeight(bracketSize: number): number {
  // Equals the height of R1 within the half: (bracketSize/4) cards with no gap.
  // Clamped to at least CARD_H to handle the degenerate 2-player case.
  return Math.max(CARD_H, (bracketSize / 4) * CARD_H);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type BracketMatch = Awaited<ReturnType<typeof getEventBracket>>[number];

// ── Match card ────────────────────────────────────────────────────────────────

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

  const p1 = match.player1?.displayName ?? "TBD";
  const p2 = match.player2?.displayName ?? (isBye ? "BYE" : "TBD");
  const isCompleted = match.status === "COMPLETED";
  const p1Wins = isCompleted && match.winnerId === match.player1Id;
  const p2Wins = isCompleted && match.winnerId === match.player2Id;
  const p1IsTBD = !match.player1;
  const p2IsTBD = !match.player2 && !isBye;

  const p1GameWins = isCompleted
    ? match.matchGames.filter((g) => g.player1Points > g.player2Points).length
    : null;
  const p2GameWins = isCompleted
    ? match.matchGames.filter((g) => g.player2Points > g.player1Points).length
    : null;

  return (
    <div
      className="w-44 overflow-hidden rounded-md border border-border bg-surface shadow-sm"
      style={{ height: CARD_H }}
    >
      {/* Player 1 row */}
      <div className="flex items-center justify-between px-3 py-1.5 text-sm">
        <span
          className={`truncate ${
            p1Wins ? "font-semibold text-text-1" : p1IsTBD ? "text-text-2" : "text-text-2"
          }`}
        >
          {p1}
        </span>
        {isCompleted && p1GameWins !== null && (
          <span className={`ml-2 shrink-0 text-xs font-bold ${p1Wins ? "text-accent" : "text-text-3"}`}>
            {p1GameWins}
          </span>
        )}
      </div>
      <div className="border-t border-border-subtle" />
      {/* Player 2 row */}
      <div className="flex items-center justify-between px-3 py-1.5 text-sm">
        <span
          className={`truncate ${
            p2Wins
              ? "font-semibold text-text-1"
              : isBye
                ? "italic text-text-3"
                : p2IsTBD
                  ? "text-text-2"
                  : "text-text-2"
          }`}
        >
          {p2}
        </span>
        {isCompleted && p2GameWins !== null && (
          <span className={`ml-2 shrink-0 text-xs font-bold ${p2Wins ? "text-accent" : "text-text-3"}`}>
            {p2GameWins}
          </span>
        )}
      </div>
      {/* Footer: status + actions */}
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
          {isTD &&
            (match.status === "PENDING" || match.status === "AWAITING_CONFIRMATION") &&
            match.player1Id &&
            match.player2Id && (
              <Link
                href={`/matches/${match.id}/td-submit`}
                className="text-[10px] font-medium text-accent underline-offset-2 hover:underline"
              >
                Enter result
              </Link>
            )}
          {isTD &&
            (match.status === "COMPLETED" || match.status === "AWAITING_CONFIRMATION") &&
            !isBye && (
              <form
                action={tdVoidMatchAction.bind(null, match.id, tournamentId, eventId)}
                className="flex items-center"
              >
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

// ── SVG connectors ────────────────────────────────────────────────────────────

/**
 * Bracket-fork SVG connector.
 *
 * For side="left": outer matches are on the left edge (x=0), inner match on
 * the right edge (x=CONN_W). Draws the standard ─┐ / ├─ / └─ shape.
 *
 * For side="right": mirror — outer matches on right edge (x=CONN_W), inner on left.
 *
 * @param outerRound  The round with more matches (the column being connected FROM)
 * @param outerCount  Number of matches in the outer half for outerRound
 * @param H           Total bracket half-height in pixels
 */
function ForkConnector({
  outerRound,
  outerCount,
  H,
  side,
}: {
  outerRound: number;
  outerCount: number;
  H: number;
  side: "left" | "right";
}) {
  const segments: React.ReactNode[] = [];

  for (let i = 0; i < outerCount; i += 2) {
    const topY = yCenter(outerRound, i);
    const bottomY = yCenter(outerRound, i + 1);
    const midY = (topY + bottomY) / 2;
    const mid = CONN_W / 2;

    if (side === "left") {
      segments.push(
        <g key={i}>
          <line x1={0} y1={topY} x2={mid} y2={topY} stroke="currentColor" strokeWidth={1} />
          <line x1={0} y1={bottomY} x2={mid} y2={bottomY} stroke="currentColor" strokeWidth={1} />
          <line x1={mid} y1={topY} x2={mid} y2={bottomY} stroke="currentColor" strokeWidth={1} />
          <line x1={mid} y1={midY} x2={CONN_W} y2={midY} stroke="currentColor" strokeWidth={1} />
        </g>,
      );
    } else {
      segments.push(
        <g key={i}>
          <line x1={CONN_W} y1={topY} x2={mid} y2={topY} stroke="currentColor" strokeWidth={1} />
          <line x1={CONN_W} y1={bottomY} x2={mid} y2={bottomY} stroke="currentColor" strokeWidth={1} />
          <line x1={mid} y1={topY} x2={mid} y2={bottomY} stroke="currentColor" strokeWidth={1} />
          <line x1={mid} y1={midY} x2={0} y2={midY} stroke="currentColor" strokeWidth={1} />
        </g>,
      );
    }
  }

  return (
    <div className="shrink-0 text-border" style={{ width: CONN_W }}>
      <div style={{ height: LABEL_H }} />
      <svg width={CONN_W} height={H} style={{ display: "block", overflow: "visible" }}>
        {segments}
      </svg>
    </div>
  );
}

/** Simple horizontal line connector (1-to-1 match, e.g. between semifinal and final) */
function SimpleConnector({ H, side }: { H: number; side: "left" | "right" }) {
  const midY = H / 2;
  return (
    <div className="shrink-0 text-border" style={{ width: CONN_W }}>
      <div style={{ height: LABEL_H }} />
      <svg width={CONN_W} height={H} style={{ display: "block" }}>
        {side === "left" ? (
          <line x1={0} y1={midY} x2={CONN_W} y2={midY} stroke="currentColor" strokeWidth={1} />
        ) : (
          <line x1={0} y1={midY} x2={CONN_W} y2={midY} stroke="currentColor" strokeWidth={1} />
        )}
      </svg>
    </div>
  );
}

// ── Bracket column ────────────────────────────────────────────────────────────

function BracketColumn({
  label,
  labelVariant,
  round,
  matches,
  H,
  isCenter,
  tournamentId,
  eventId,
  isTD,
}: {
  label: string;
  labelVariant: "default" | "final";
  round: number;
  matches: BracketMatch[];
  H: number;
  isCenter: boolean;
  tournamentId: string;
  eventId: string;
  isTD: boolean;
}) {
  const factor = Math.pow(2, round - 1);
  const paddingTop = isCenter
    ? (H - CARD_H) / 2
    : ((factor - 1) * CARD_H) / 2;
  const gap = isCenter ? 0 : (factor - 1) * CARD_H;

  return (
    <div className="flex shrink-0 flex-col" style={{ width: CARD_W }}>
      <div
        style={{ height: LABEL_H }}
        className="flex items-end pb-3"
      >
        <p
          className={`text-xs uppercase tracking-wide ${
            labelVariant === "final"
              ? "font-bold text-text-1"
              : "font-medium text-text-3"
          }`}
        >
          {label}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: H,
          paddingTop,
          gap,
        }}
      >
        {matches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            tournamentId={tournamentId}
            eventId={eventId}
            isTD={isTD}
          />
        ))}
      </div>
    </div>
  );
}

// ── Placeholder bracket (RR→SE pre-generation) ───────────────────────────────

type PlaceholderSlot = { p1: string; p2: string };

/**
 * Computes per-group player rankings for fully completed groups only.
 * Returns groupNumber → ordered array of displayNames (index 0 = rank 1).
 */
function computeCompletedGroupRankings(
  rrMatches: BracketMatch[],
): Map<number, string[]> {
  const byGroup = new Map<number, BracketMatch[]>();
  for (const m of rrMatches) {
    if (m.groupNumber === null) continue;
    if (!byGroup.has(m.groupNumber)) byGroup.set(m.groupNumber, []);
    byGroup.get(m.groupNumber)!.push(m);
  }

  const result = new Map<number, string[]>();
  for (const [groupNum, gMatches] of byGroup) {
    if (!gMatches.every((m) => m.status === "COMPLETED")) continue;

    const winCount = new Map<string, number>();
    const names = new Map<string, string>();
    for (const m of gMatches) {
      if (m.player1Id && m.player1) {
        names.set(m.player1Id, m.player1.displayName);
        if (!winCount.has(m.player1Id)) winCount.set(m.player1Id, 0);
      }
      if (m.player2Id && m.player2) {
        names.set(m.player2Id, m.player2.displayName);
        if (!winCount.has(m.player2Id)) winCount.set(m.player2Id, 0);
      }
      if (m.winnerId) winCount.set(m.winnerId, (winCount.get(m.winnerId) ?? 0) + 1);
    }

    const ranked = [...winCount.keys()].sort(
      (a, b) => (winCount.get(b) ?? 0) - (winCount.get(a) ?? 0),
    );
    result.set(groupNum, ranked.map((id) => names.get(id) ?? "?"));
  }

  return result;
}

/**
 * Maps a seed number to a human-readable label for the placeholder bracket.
 * Uses the same ascending inter-group ordering as computeAdvancers (all ranks ascending).
 * When a group is fully complete, uses actual player names instead of generic labels.
 */
function seedToGroupLabel(
  seed: number,
  numGroups: number,
  numSlots: number,
  completedGroups: Map<number, string[]>,
): string {
  if (seed > numSlots) return "BYE";
  const rank = Math.ceil(seed / numGroups);
  const idxInRank = (seed - 1) % numGroups;
  // All ranks use ascending group order (same as computeAdvancers)
  const groupNum = idxInRank + 1;

  const groupRanking = completedGroups.get(groupNum);
  if (groupRanking && groupRanking[rank - 1]) {
    return groupRanking[rank - 1];
  }

  const ordinal = rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`;
  return `Group ${groupNum} — ${ordinal}`;
}

/**
 * Computes R1 slot labels and layout dimensions for the placeholder bracket.
 * R1 slots carry group/rank labels; all higher rounds show "TBD".
 */
function computePlaceholderBracket(
  numGroups: number,
  advancersPerGroup: number,
  completedGroups: Map<number, string[]>,
) {
  const numSlots = numGroups * advancersPerGroup;
  const totalRounds = Math.ceil(Math.log2(numSlots));
  const bracketSize = Math.pow(2, totalRounds);
  const H = halfHeight(bracketSize);
  const seedOrder = bracketSeedOrder(bracketSize);

  // Left half: positions 1..(bracketSize/4); right half: (bracketSize/4)+1..(bracketSize/2)
  const halfCount = (round: number) => bracketSize / Math.pow(2, round + 1);

  function slotsForHalf(round: number, isLeft: boolean): PlaceholderSlot[] {
    const count = halfCount(round);
    if (round === 1) {
      const offset = isLeft ? 0 : count;
      return Array.from({ length: count }, (_, i) => {
        const pos = offset + i; // 0-indexed position within R1
        return {
          p1: seedToGroupLabel(seedOrder[2 * pos], numGroups, numSlots, completedGroups),
          p2: seedToGroupLabel(seedOrder[2 * pos + 1], numGroups, numSlots, completedGroups),
        };
      });
    }
    return Array.from({ length: count }, () => ({ p1: "TBD", p2: "TBD" }));
  }

  const finalSlot: PlaceholderSlot = { p1: "TBD", p2: "TBD" };

  return { totalRounds, bracketSize, H, halfCount, slotsForHalf, finalSlot };
}

function PlaceholderCard({ p1, p2 }: PlaceholderSlot) {
  const isBye = p2 === "BYE";
  const isTBD = p1 === "TBD";
  return (
    <div
      className="w-44 overflow-hidden rounded-md border border-border bg-surface shadow-sm"
      style={{ height: CARD_H }}
    >
      <div className="flex items-center px-3 py-1.5 text-sm">
        <span className="truncate text-text-2">{p1}</span>
      </div>
      <div className="border-t border-border-subtle" />
      <div className="flex items-center px-3 py-1.5 text-sm">
        <span className={`truncate ${isBye ? "italic text-text-3" : "text-text-2"}`}>{p2}</span>
      </div>
      <div className="flex items-center border-t border-border-subtle bg-elevated px-3 py-1">
        <span className="text-[10px] uppercase tracking-wide text-text-3">
          {isBye ? "bye" : isTBD ? "—" : "upcoming"}
        </span>
      </div>
    </div>
  );
}

function PlaceholderBracketColumn({
  label,
  labelVariant,
  round,
  slots,
  H,
  isCenter,
}: {
  label: string;
  labelVariant: "default" | "final";
  round: number;
  slots: PlaceholderSlot[];
  H: number;
  isCenter: boolean;
}) {
  const factor = Math.pow(2, round - 1);
  const paddingTop = isCenter ? (H - CARD_H) / 2 : ((factor - 1) * CARD_H) / 2;
  const gap = isCenter ? 0 : (factor - 1) * CARD_H;

  return (
    <div className="flex shrink-0 flex-col" style={{ width: CARD_W }}>
      <div style={{ height: LABEL_H }} className="flex items-end pb-3">
        <p
          className={`text-xs uppercase tracking-wide ${
            labelVariant === "final"
              ? "font-bold text-text-1"
              : "font-medium text-text-3"
          }`}
        >
          {label}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: H,
          paddingTop,
          gap,
        }}
      >
        {slots.map((s, i) => (
          <PlaceholderCard key={i} p1={s.p1} p2={s.p2} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

  // For RR_TO_SE: only show SE matches (groupNumber === null)
  const bracketMatches =
    event.eventFormat === "RR_TO_SE"
      ? matches.filter((m) => m.groupNumber === null)
      : matches;

  const backHref =
    from === "manage"
      ? `/tournaments/${id}/events/${eventId}/manage`
      : `/tournaments/${id}/events/${eventId}`;

  if (bracketMatches.length === 0) {
    // For RR→SE: show placeholder bracket if RR has been generated
    const rrMatchesExist = matches.length > 0;
    const numGroups =
      event.eventFormat === "RR_TO_SE" && rrMatchesExist
        ? Math.max(
            0,
            ...event.eventEntries
              .map((e) => e.groupNumber)
              .filter((g): g is number => g !== null),
          )
        : 0;
    const showPlaceholder =
      event.eventFormat === "RR_TO_SE" &&
      rrMatchesExist &&
      numGroups > 0 &&
      !!event.advancersPerGroup;

    if (!showPlaceholder) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-12">
          <p className="text-sm text-text-2">
            {event.eventFormat === "RR_TO_SE"
              ? "SE bracket not generated yet — complete all group matches first."
              : "No bracket generated yet."}
          </p>
          <Link href={backHref} className="mt-4 inline-block text-sm text-text-2 hover:text-text-1">
            {from === "manage" ? "← Back to manage event" : "← Back to event"}
          </Link>
        </main>
      );
    }

    const rrMatches = matches.filter((m) => m.groupNumber !== null);
    const completedGroups = computeCompletedGroupRankings(rrMatches);
    const ph = computePlaceholderBracket(numGroups, event.advancersPerGroup!, completedGroups);
    const leftRounds = Array.from({ length: ph.totalRounds - 1 }, (_, i) => i + 1);
    const rightRounds = [...leftRounds].reverse();

    return (
      <main className="px-6 py-12">
        {/* Header */}
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
          <h1 className="text-2xl font-semibold text-text-1">Bracket</h1>
        </div>

        {/* Placeholder bracket */}
        <div className="overflow-x-auto pb-8">
          <div className="flex items-start" style={{ minWidth: "max-content" }}>

            {/* LEFT SIDE */}
            {leftRounds.map((round, idx) => {
              const isLastLeft = idx === leftRounds.length - 1;
              const count = ph.halfCount(round);
              return (
                <div key={`l-${round}`} className="flex items-start">
                  <PlaceholderBracketColumn
                    label={getRoundLabel(round, ph.totalRounds)}
                    labelVariant="default"
                    round={round}
                    slots={ph.slotsForHalf(round, true)}
                    H={ph.H}
                    isCenter={false}
                  />
                  {isLastLeft ? (
                    <SimpleConnector H={ph.H} side="left" />
                  ) : (
                    <ForkConnector outerRound={round} outerCount={count} H={ph.H} side="left" />
                  )}
                </div>
              );
            })}

            {/* FINAL */}
            <PlaceholderBracketColumn
              label="Final"
              labelVariant="final"
              round={ph.totalRounds}
              slots={[ph.finalSlot]}
              H={ph.H}
              isCenter={true}
            />

            {/* RIGHT SIDE */}
            {rightRounds.map((round, idx) => {
              const isFirstRight = idx === 0;
              const count = ph.halfCount(round);
              return (
                <div key={`r-${round}`} className="flex items-start">
                  {isFirstRight ? (
                    <SimpleConnector H={ph.H} side="right" />
                  ) : (
                    <ForkConnector outerRound={round} outerCount={count} H={ph.H} side="right" />
                  )}
                  <PlaceholderBracketColumn
                    label={getRoundLabel(round, ph.totalRounds)}
                    labelVariant="default"
                    round={round}
                    slots={ph.slotsForHalf(round, false)}
                    H={ph.H}
                    isCenter={false}
                  />
                </div>
              );
            })}

          </div>
        </div>

        <Link href={backHref} className="text-sm text-text-2 transition-colors hover:text-text-1">
          {from === "manage" ? "← Back to manage event" : "← Back to event"}
        </Link>
      </main>
    );
  }

  // ── Derive bracket dimensions ─────────────────────────────────────────────

  const roundMap = new Map<number, BracketMatch[]>();
  for (const m of bracketMatches) {
    if (!roundMap.has(m.round)) roundMap.set(m.round, []);
    roundMap.get(m.round)!.push(m);
  }
  const roundNumbers = [...roundMap.keys()].sort((a, b) => a - b);
  const totalRounds = roundNumbers[roundNumbers.length - 1];
  const bracketSize = Math.pow(2, totalRounds);
  const H = halfHeight(bracketSize);

  // Sorted R1 matches are the authoritative source for which positions exist.
  // Left half: positions 1..(bracketSize/4), Right half: (bracketSize/4)+1..(bracketSize/2)
  const leftHalfCount = (round: number) => bracketSize / Math.pow(2, round + 1);

  function leftMatches(round: number): BracketMatch[] {
    const half = leftHalfCount(round);
    return (roundMap.get(round) ?? [])
      .filter((m) => m.position <= half)
      .sort((a, b) => a.position - b.position);
  }

  function rightMatches(round: number): BracketMatch[] {
    const half = leftHalfCount(round);
    return (roundMap.get(round) ?? [])
      .filter((m) => m.position > half)
      .sort((a, b) => a.position - b.position);
  }

  const finalMatch = (roundMap.get(totalRounds) ?? [])[0];
  const leftRounds = Array.from({ length: totalRounds - 1 }, (_, i) => i + 1);
  // Right side: innermost first (totalRounds-1 → 1), left-to-right in the visual
  const rightRounds = [...leftRounds].reverse();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="px-6 py-12">
      {/* Header */}
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

      {/* Bracket */}
      <div className="overflow-x-auto pb-8">
        <div className="flex items-start" style={{ minWidth: "max-content" }}>

          {/* ── LEFT SIDE ── */}
          {leftRounds.map((round, idx) => {
            const isLastLeft = idx === leftRounds.length - 1;
            const count = leftHalfCount(round);
            return (
              <div key={`l-${round}`} className="flex items-start">
                <BracketColumn
                  label={getRoundLabel(round, totalRounds)}
                  labelVariant="default"
                  round={round}
                  matches={leftMatches(round)}
                  H={H}
                  isCenter={false}
                  tournamentId={id}
                  eventId={eventId}
                  isTD={isTD}
                />
                {isLastLeft ? (
                  <SimpleConnector H={H} side="left" />
                ) : (
                  <ForkConnector outerRound={round} outerCount={count} H={H} side="left" />
                )}
              </div>
            );
          })}

          {/* ── FINAL ── */}
          <BracketColumn
            label="Final"
            labelVariant="final"
            round={totalRounds}
            matches={finalMatch ? [finalMatch] : []}
            H={H}
            isCenter={true}
            tournamentId={id}
            eventId={eventId}
            isTD={isTD}
          />

          {/* ── RIGHT SIDE ── */}
          {rightRounds.map((round, idx) => {
            const isFirstRight = idx === 0;
            const count = leftHalfCount(round);
            return (
              <div key={`r-${round}`} className="flex items-start">
                {isFirstRight ? (
                  <SimpleConnector H={H} side="right" />
                ) : (
                  // outerRound is the CURRENT round (more matches, outer column)
                  <ForkConnector outerRound={round} outerCount={count} H={H} side="right" />
                )}
                <BracketColumn
                  label={getRoundLabel(round, totalRounds)}
                  labelVariant="default"
                  round={round}
                  matches={rightMatches(round)}
                  H={H}
                  isCenter={false}
                  tournamentId={id}
                  eventId={eventId}
                  isTD={isTD}
                />
              </div>
            );
          })}

        </div>
      </div>

      <Link
        href={backHref}
        className="text-sm text-text-2 transition-colors hover:text-text-1"
      >
        {from === "manage" ? "← Back to manage event" : "← Back to event"}
      </Link>
    </main>
  );
}
