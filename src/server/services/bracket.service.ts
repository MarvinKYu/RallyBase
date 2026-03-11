import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSingleEliminationBlueprint,
  nextMatchCoords,
  winnerSlotInNextMatch,
} from "@/server/algorithms/bracket";
import {
  findMatchesByEventId,
  countMatchesByEventId,
} from "@/server/repositories/bracket.repository";
import { getEventDetail } from "@/server/services/tournament.service";

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getEventBracket(eventId: string) {
  return findMatchesByEventId(eventId);
}

export async function bracketExists(eventId: string) {
  const count = await countMatchesByEventId(eventId);
  return count > 0;
}

// ── Bracket generation ────────────────────────────────────────────────────────

/**
 * Generates a single-elimination bracket for an event and persists it.
 *
 * Steps:
 *  1. Load event entries, sort by seed (nulls last).
 *  2. Build the bracket blueprint (pure function).
 *  3. In a single transaction, create matches from the final backward to R1
 *     so each match can reference its nextMatchId immediately.
 *  4. Advance bye winners into the next round.
 */
export async function generateBracket(eventId: string): Promise<void> {
  const event = await getEventDetail(eventId);
  if (!event) throw new Error("Event not found");

  const existing = await countMatchesByEventId(eventId);
  if (existing > 0) throw new Error("Bracket has already been generated for this event");

  if (event.eventEntries.length < 2) {
    throw new Error("At least 2 entrants are required to generate a bracket");
  }

  // Sort by seed (ascending), unseeded entries go last
  const sorted = [...event.eventEntries].sort((a, b) => {
    if (a.seed === null && b.seed === null) return 0;
    if (a.seed === null) return 1;
    if (b.seed === null) return -1;
    return a.seed - b.seed;
  });

  const playerIds = sorted.map((e) => e.playerProfileId);
  const { totalRounds, matches } = buildSingleEliminationBlueprint(playerIds);

  // Index blueprints by "round-position" for quick lookup
  const blueprintMap = new Map(
    matches.map((m) => [`${m.round}-${m.position}`, m]),
  );

  await prisma.$transaction(async (tx) => {
    // Map of "round-position" → created match ID
    const matchIdMap = new Map<string, string>();

    // Create matches from the final (highest round) down to R1,
    // so the nextMatchId reference is always available when needed.
    for (let round = totalRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, totalRounds - round);

      for (let position = 1; position <= matchesInRound; position++) {
        const blueprint = blueprintMap.get(`${round}-${position}`)!;
        const next = nextMatchCoords(round, position, totalRounds);
        const nextMatchId = next
          ? (matchIdMap.get(`${next.round}-${next.position}`) ?? null)
          : null;

        const isBye =
          round === 1 &&
          blueprint.player1Id !== null &&
          blueprint.player2Id === null;

        const match = await tx.match.create({
          data: {
            eventId,
            round,
            position,
            player1Id: blueprint.player1Id,
            player2Id: blueprint.player2Id,
            nextMatchId,
            status: isBye ? MatchStatus.COMPLETED : MatchStatus.PENDING,
            winnerId: isBye ? blueprint.player1Id : null,
          },
        });

        matchIdMap.set(`${round}-${position}`, match.id);
      }
    }

    // Advance bye winners into their next-round slot
    const r1MatchCount = Math.pow(2, totalRounds - 1);
    for (let position = 1; position <= r1MatchCount; position++) {
      const blueprint = blueprintMap.get(`1-${position}`)!;
      const isBye = blueprint.player1Id !== null && blueprint.player2Id === null;

      if (isBye) {
        const next = nextMatchCoords(1, position, totalRounds);
        if (next) {
          const nextMatchId = matchIdMap.get(`${next.round}-${next.position}`)!;
          const slot = winnerSlotInNextMatch(position);
          await tx.match.update({
            where: { id: nextMatchId },
            data: { [slot]: blueprint.player1Id },
          });
        }
      }
    }
  });
}
