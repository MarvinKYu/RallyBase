import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSingleEliminationBlueprint,
  nextMatchCoords,
  winnerSlotInNextMatch,
} from "@/server/algorithms/bracket";
import { buildRoundRobinSchedule } from "@/server/algorithms/round-robin";
import { computeHeadToHead, compareTiebreakers } from "@/server/algorithms/round-robin-tiebreaker";
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

// ── Podium ────────────────────────────────────────────────────────────────────

export interface EventPodium {
  first: { id: string; displayName: string } | null;
  second: { id: string; displayName: string } | null;
}

export async function getEventPodium(
  eventId: string,
  eventFormat: string,
): Promise<EventPodium> {
  if (eventFormat === "ROUND_ROBIN") {
    const standings = await getRoundRobinStandings(eventId);
    return {
      first: standings[0]
        ? { id: standings[0].playerProfileId, displayName: standings[0].displayName }
        : null,
      second: standings[1]
        ? { id: standings[1].playerProfileId, displayName: standings[1].displayName }
        : null,
    };
  }

  // Single elimination: final = highest-round completed match
  const finalMatch = await prisma.match.findFirst({
    where: { eventId, winnerId: { not: null } },
    include: {
      player1: { select: { id: true, displayName: true } },
      player2: { select: { id: true, displayName: true } },
      winner: { select: { id: true, displayName: true } },
    },
    orderBy: { round: "desc" },
  });

  if (!finalMatch?.winner) return { first: null, second: null };

  const loser =
    finalMatch.player1Id === finalMatch.winnerId
      ? finalMatch.player2
      : finalMatch.player1;

  return { first: finalMatch.winner, second: loser };
}

// ── Standings ─────────────────────────────────────────────────────────────────

export interface RoundRobinStanding {
  playerProfileId: string;
  displayName: string;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  tied: boolean;
}

export async function getRoundRobinStandings(eventId: string): Promise<RoundRobinStanding[]> {
  const matches = await prisma.match.findMany({
    where: { eventId, status: MatchStatus.COMPLETED },
    include: {
      player1: { select: { id: true, displayName: true } },
      player2: { select: { id: true, displayName: true } },
      matchGames: true,
    },
  });

  // Collect all players from event entries
  const event = await getEventDetail(eventId);
  if (!event) return [];

  const standingsMap = new Map<string, RoundRobinStanding>();

  for (const entry of event.eventEntries) {
    standingsMap.set(entry.playerProfileId, {
      playerProfileId: entry.playerProfileId,
      displayName: entry.playerProfile.displayName,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      rank: 0,
      tied: false,
    });
  }

  for (const match of matches) {
    if (!match.player1Id || !match.player2Id || !match.winnerId) continue;

    const p1 = standingsMap.get(match.player1Id);
    const p2 = standingsMap.get(match.player2Id);

    if (p1) {
      const won = match.winnerId === match.player1Id;
      p1.wins += won ? 1 : 0;
      p1.losses += won ? 0 : 1;
      for (const g of match.matchGames) {
        p1.gamesWon += g.player1Points > g.player2Points ? 1 : 0;
        p1.gamesLost += g.player1Points < g.player2Points ? 1 : 0;
        p1.pointsFor += g.player1Points;
        p1.pointsAgainst += g.player2Points;
      }
    }

    if (p2) {
      const won = match.winnerId === match.player2Id;
      p2.wins += won ? 1 : 0;
      p2.losses += won ? 0 : 1;
      for (const g of match.matchGames) {
        p2.gamesWon += g.player2Points > g.player1Points ? 1 : 0;
        p2.gamesLost += g.player2Points < g.player1Points ? 1 : 0;
        p2.pointsFor += g.player2Points;
        p2.pointsAgainst += g.player1Points;
      }
    }
  }

  // Group by win count, sort each group with H2H tiebreakers, assign ranks
  const winGroups = new Map<number, RoundRobinStanding[]>();
  for (const s of standingsMap.values()) {
    if (!winGroups.has(s.wins)) winGroups.set(s.wins, []);
    winGroups.get(s.wins)!.push(s);
  }

  const finalSorted: RoundRobinStanding[] = [];
  const sortedWinCounts = [...winGroups.keys()].sort((a, b) => b - a);

  for (const wins of sortedWinCounts) {
    const group = winGroups.get(wins)!;
    const startRank = finalSorted.length + 1;

    if (group.length === 1) {
      group[0].rank = startRank;
      group[0].tied = false;
      finalSorted.push(group[0]);
      continue;
    }

    const hhMap = computeHeadToHead(group.map((p) => p.playerProfileId), matches);
    const compare = (a: RoundRobinStanding, b: RoundRobinStanding) =>
      compareTiebreakers(a.playerProfileId, b.playerProfileId, hhMap, group.length);

    group.sort(compare);

    // Assign ranks within the group — players with equal tiebreakers share a rank
    for (let i = 0; i < group.length; i++) {
      if (i === 0) {
        group[i].rank = startRank;
      } else if (compare(group[i - 1], group[i]) === 0) {
        group[i].rank = group[i - 1].rank;
      } else {
        group[i].rank = startRank + i;
      }
    }

    // Mark tied flag for players sharing a rank
    for (let i = 0; i < group.length; i++) {
      group[i].tied =
        (i > 0 && group[i].rank === group[i - 1].rank) ||
        (i < group.length - 1 && group[i].rank === group[i + 1].rank);
    }

    finalSorted.push(...group);
  }

  return finalSorted;
}

// ── Bracket generation ────────────────────────────────────────────────────────

/**
 * Generates a bracket for an event and persists it.
 * Branches on eventFormat: SINGLE_ELIMINATION or ROUND_ROBIN.
 */
export async function generateBracket(eventId: string): Promise<void> {
  const event = await getEventDetail(eventId);
  if (!event) throw new Error("Event not found");

  const existing = await countMatchesByEventId(eventId);
  if (existing > 0) throw new Error("Bracket has already been generated for this event");

  if (event.eventEntries.length < 2) {
    throw new Error("At least 2 entrants are required to generate a bracket");
  }

  if (event.eventFormat === "ROUND_ROBIN") {
    await generateRoundRobinBracket(eventId, event.eventEntries.map((e) => e.playerProfileId));
  } else {
    await generateSingleEliminationBracket(eventId, event.eventEntries);
  }
}

async function generateRoundRobinBracket(eventId: string, playerIds: string[]): Promise<void> {
  const { matches } = buildRoundRobinSchedule(playerIds);

  await prisma.$transaction(async (tx) => {
    for (const m of matches) {
      await tx.match.create({
        data: {
          eventId,
          round: m.round,
          position: m.position,
          player1Id: m.player1Id,
          player2Id: m.player2Id,
          nextMatchId: null,
          status: MatchStatus.PENDING,
          winnerId: null,
        },
      });
    }
  });
}

async function generateSingleEliminationBracket(
  eventId: string,
  eventEntries: Array<{ playerProfileId: string; seed: number | null }>,
): Promise<void> {
  // Sort by seed (ascending), unseeded entries go last
  const sorted = [...eventEntries].sort((a, b) => {
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
