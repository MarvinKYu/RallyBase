import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSingleEliminationBlueprint,
  nextMatchCoords,
  winnerSlotInNextMatch,
} from "@/server/algorithms/bracket";
import { buildRoundRobinSchedule } from "@/server/algorithms/round-robin";
import { assignGroups } from "@/server/algorithms/group-draw";
import { computeHeadToHead, compareTiebreakers } from "@/server/algorithms/round-robin-tiebreaker";
import { computeAdvancers } from "@/server/algorithms/advancer";
import type { TiedGroup } from "@/server/algorithms/advancer";
import {
  findMatchesByEventId,
  countMatchesByEventId,
  countRRMatches,
  countIncompleteRRMatches,
  countSEMatches,
  countActiveSEMatches,
  deleteSEMatches,
  findEntryAdvancementOverrides,
  stampEntrySeeds,
  clearEntrySeeds,
  setEntryAdvancesToSE,
  findSETotalRounds,
  findThirdPlaceMatch,
} from "@/server/repositories/bracket.repository";
import { getEventDetail } from "@/server/services/tournament.service";

// Re-export TiedGroup so UI and actions can import it from one place
export type { TiedGroup };

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
  third: { id: string; displayName: string } | null;
}

export async function getEventPodium(
  eventId: string,
  eventFormat: string,
  groupSize?: number | null,
): Promise<EventPodium> {
  if (eventFormat === "ROUND_ROBIN") {
    // Multi-group events have no cross-group ranking — podium is not defined
    if (groupSize) return { first: null, second: null, third: null };

    const standings = await getRoundRobinStandings(eventId);
    return {
      first: standings[0]
        ? { id: standings[0].playerProfileId, displayName: standings[0].displayName }
        : null,
      second: standings[1]
        ? { id: standings[1].playerProfileId, displayName: standings[1].displayName }
        : null,
      third: null,
    };
  }

  if (eventFormat === "RR_TO_SE") {
    // Podium comes from the SE stage final (SE matches have groupNumber = null)
    const seExists = (await countSEMatches(eventId)) > 0;
    if (!seExists) return { first: null, second: null, third: null };
    // Fall through to SE bracket logic below
  }

  // Single elimination (and RR_TO_SE SE stage):
  // final = highest-round completed non-3rd-place SE match
  const finalMatch = await prisma.match.findFirst({
    where: { eventId, groupNumber: null, winnerId: { not: null }, isThirdPlaceMatch: false },
    include: {
      player1: { select: { id: true, displayName: true } },
      player2: { select: { id: true, displayName: true } },
      winner: { select: { id: true, displayName: true } },
    },
    orderBy: { round: "desc" },
  });

  if (!finalMatch?.winner) return { first: null, second: null, third: null };

  const loser =
    finalMatch.player1Id === finalMatch.winnerId
      ? finalMatch.player2
      : finalMatch.player1;

  // 3rd place: winner of the isThirdPlaceMatch match (if any)
  const thirdPlaceMatch = await prisma.match.findFirst({
    where: { eventId, isThirdPlaceMatch: true, winnerId: { not: null } },
    include: { winner: { select: { id: true, displayName: true } } },
  });
  const third = thirdPlaceMatch?.winner ?? null;

  return { first: finalMatch.winner, second: loser, third };
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

export interface GroupedRoundRobinStandings {
  groupNumber: number;
  standings: RoundRobinStanding[];
}

export async function getRoundRobinStandings(eventId: string): Promise<RoundRobinStanding[]>;
export async function getRoundRobinStandings(
  eventId: string,
  grouped: true,
): Promise<GroupedRoundRobinStandings[]>;
export async function getRoundRobinStandings(
  eventId: string,
  grouped?: true,
): Promise<RoundRobinStanding[] | GroupedRoundRobinStandings[]> {
  const event = await getEventDetail(eventId);
  if (!event) return [];

  const matches = await prisma.match.findMany({
    where: { eventId, status: MatchStatus.COMPLETED },
    include: {
      player1: { select: { id: true, displayName: true } },
      player2: { select: { id: true, displayName: true } },
      matchGames: true,
    },
  });

  if (grouped && event.groupSize) {
    // Build standings per group
    const groupNumbers = [
      ...new Set(
        event.eventEntries.map((e) => e.groupNumber).filter((g): g is number => g !== null),
      ),
    ].sort((a, b) => a - b);

    return groupNumbers.map((groupNum) => {
      const groupEntries = event.eventEntries.filter((e) => e.groupNumber === groupNum);
      const groupMatches = matches.filter((m) => m.groupNumber === groupNum);
      return {
        groupNumber: groupNum,
        standings: computeStandingsForGroup(groupEntries, groupMatches),
      };
    });
  }

  // Single group (legacy) or flat list for callers that don't need groups
  return computeStandingsForGroup(event.eventEntries, matches);
}

function computeStandingsForGroup(
  entries: Array<{ playerProfileId: string; playerProfile: { displayName: string } }>,
  matches: Array<{
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
    matchGames: Array<{ player1Points: number; player2Points: number }>;
  }>,
): RoundRobinStanding[] {
  const standingsMap = new Map<string, RoundRobinStanding>();

  for (const entry of entries) {
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
    await generateRoundRobinBracket(event);
  } else if (event.eventFormat === "RR_TO_SE") {
    // RR phase only — SE stage is generated separately after all group matches complete
    await generateRoundRobinBracket(event);
  } else {
    const { ratingCategoryId } = event;
    await prisma.$transaction(
      event.eventEntries.map((e) => {
        const snap =
          e.playerProfile.playerRatings.find((r) => r.ratingCategoryId === ratingCategoryId)
            ?.rating ?? null;
        return prisma.eventEntry.update({
          where: { eventId_playerProfileId: { eventId, playerProfileId: e.playerProfileId } },
          data: { ratingSnapshot: snap },
        });
      }),
    );
    await generateSingleEliminationBracket(eventId, event.eventEntries, event.hasThirdPlaceMatch);
  }
}

async function generateRoundRobinBracket(
  event: NonNullable<Awaited<ReturnType<typeof getEventDetail>>>,
): Promise<void> {
  const { eventEntries, groupSize, ratingCategoryId } = event;
  const eventId = event.id;

  if (groupSize) {
    // Multi-group: distribute players by rating using snake seeding
    const ratings = eventEntries.map(
      (e) =>
        e.playerProfile.playerRatings.find((r) => r.ratingCategoryId === ratingCategoryId)
          ?.rating ?? 1500,
    );
    const playerIds = eventEntries.map((e) => e.playerProfileId);
    const playerRatingMap = new Map(playerIds.map((id, i) => [id, ratings[i]]));
    const totalGroups =
      event.maxParticipants != null ? event.maxParticipants / groupSize : undefined;
    const groups = assignGroups(playerIds, ratings, groupSize, totalGroups);

    await prisma.$transaction(async (tx) => {
      for (let gi = 0; gi < groups.length; gi++) {
        const groupNumber = gi + 1; // 1-indexed
        const groupPlayerIds = groups[gi];
        const { matches } = buildRoundRobinSchedule(groupPlayerIds);

        for (const m of matches) {
          await tx.match.create({
            data: {
              eventId,
              round: m.round,
              position: m.position,
              groupNumber,
              player1Id: m.player1Id,
              player2Id: m.player2Id,
              nextMatchId: null,
              status: MatchStatus.PENDING,
              winnerId: null,
            },
          });
        }

        // Stamp group assignment and rating snapshot on EventEntry rows
        for (const pid of groupPlayerIds) {
          await tx.eventEntry.update({
            where: { eventId_playerProfileId: { eventId, playerProfileId: pid } },
            data: { groupNumber, ratingSnapshot: playerRatingMap.get(pid) ?? null },
          });
        }
      }
    });
  } else {
    // Single group (legacy): all players in one schedule, no groupNumber
    const playerIds = eventEntries.map((e) => e.playerProfileId);
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
}

async function generateSingleEliminationBracket(
  eventId: string,
  eventEntries: Array<{ playerProfileId: string; seed: number | null }>,
  hasThirdPlaceMatch = false,
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

  if (hasThirdPlaceMatch && totalRounds < 2) {
    throw new Error(
      "A 3rd/4th place match requires at least 4 players so there is a semifinal round.",
    );
  }

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

  // Create the 3rd/4th place match after the main bracket transaction.
  // It sits at the same round as the Final (round = totalRounds, position = 2)
  // with both player slots empty — they are filled in as semifinals complete.
  if (hasThirdPlaceMatch) {
    await prisma.match.create({
      data: {
        eventId,
        round: totalRounds,
        position: 2,
        isThirdPlaceMatch: true,
        player1Id: null,
        player2Id: null,
        nextMatchId: null,
        status: MatchStatus.PENDING,
        winnerId: null,
      },
    });
  }
}

// ── RR → SE stage ─────────────────────────────────────────────────────────────

export type GenerateSEStageResult =
  | { ok: true }
  | { ok: false; reason: "incomplete_rr" | "tie"; tiedGroups?: TiedGroup[] };

/**
 * Generates the SE bracket stage for an RR_TO_SE event.
 * Reads per-group standings, computes advancers with inter-group snake seeding,
 * stamps EventEntry.seed, and creates SE matches (groupNumber = null).
 *
 * Returns { ok: false, reason: 'incomplete_rr' } if any RR matches are unfinished.
 * Returns { ok: false, reason: 'tie', tiedGroups } if a tie at the advancement
 * boundary remains unresolved.
 */
export async function generateSEStage(eventId: string): Promise<GenerateSEStageResult> {
  const event = await getEventDetail(eventId);
  if (!event) throw new Error("Event not found");
  if (event.eventFormat !== "RR_TO_SE") throw new Error("Event is not RR_TO_SE format");

  const advancersPerGroup = event.advancersPerGroup;
  if (!advancersPerGroup) throw new Error("advancersPerGroup is not configured for this event");

  // Guard: all RR matches must be complete
  const incompleteRR = await countIncompleteRRMatches(eventId);
  if (incompleteRR > 0) {
    return { ok: false, reason: "incomplete_rr" };
  }

  // Get per-group standings and tie-resolution overrides
  const groupStandings = await getRoundRobinStandings(eventId, true);
  const overrides = await findEntryAdvancementOverrides(eventId);

  const result = computeAdvancers(groupStandings, advancersPerGroup, overrides);
  if (!result.ok) {
    return { ok: false, reason: "tie", tiedGroups: result.tiedGroups };
  }

  const { advancers } = result;

  // Stamp SE seeds on EventEntry rows
  await stampEntrySeeds(
    advancers.map((a) => ({ eventId, playerProfileId: a.playerProfileId, seed: a.seSeed })),
  );

  // Build and persist the SE bracket using advancers already in seed order
  await generateSingleEliminationBracket(
    eventId,
    advancers.map((a) => ({ playerProfileId: a.playerProfileId, seed: a.seSeed })),
    event.hasThirdPlaceMatch,
  );

  return { ok: true };
}

/**
 * Re-generates the SE bracket stage, replacing any existing SE matches.
 * Blocked if any SE match has already been played (IN_PROGRESS, AWAITING_CONFIRMATION, or COMPLETED).
 */
export async function regenerateSEStage(eventId: string): Promise<GenerateSEStageResult> {
  const activeCount = await countActiveSEMatches(eventId);
  if (activeCount > 0) {
    throw new Error(
      "Cannot re-generate bracket: some bracket matches have already been played.",
    );
  }

  // Delete existing SE matches and clear seeds
  await deleteSEMatches(eventId);
  await clearEntrySeeds(eventId);

  return generateSEStage(eventId);
}

export interface SEStageStatus {
  rrComplete: boolean;
  seExists: boolean;
  seCanRegenerate: boolean; // SE exists but no matches played yet
  ties: TiedGroup[] | null;
  seTotalRounds: number | null;
}

/**
 * Returns the current SE stage status for a RR_TO_SE event.
 * Used by the manage event page to decide what controls to render.
 */
export async function checkSEStageStatus(eventId: string): Promise<SEStageStatus> {
  const [rrMatchCount, incompleteRR, seMatchCount, activeSECount, seTotalRounds] = await Promise.all([
    countRRMatches(eventId),
    countIncompleteRRMatches(eventId),
    countSEMatches(eventId),
    countActiveSEMatches(eventId),
    findSETotalRounds(eventId),
  ]);

  // Only true when a schedule has been generated AND every RR match is finished.
  // An event with no schedule (rrMatchCount === 0) must not be treated as RR-complete.
  const rrComplete = rrMatchCount > 0 && incompleteRR === 0;
  const seExists = seMatchCount > 0;
  const seCanRegenerate = seExists && activeSECount === 0;

  let ties: TiedGroup[] | null = null;
  if (rrComplete && !seExists) {
    const event = await getEventDetail(eventId);
    const advancersPerGroup = event?.advancersPerGroup;
    if (event && advancersPerGroup) {
      const groupStandings = await getRoundRobinStandings(eventId, true);
      const overrides = await findEntryAdvancementOverrides(eventId);
      const result = computeAdvancers(groupStandings, advancersPerGroup, overrides);
      if (!result.ok) ties = result.tiedGroups;
    }
  }

  return { rrComplete, seExists, seCanRegenerate, ties, seTotalRounds };
}

/**
 * Records a TD's manual tie-resolution choice for one group.
 * Sets advancesToSE = true for the chosen player and false for the excluded ones,
 * then attempts SE generation (which may still be blocked by ties in other groups).
 */
export async function resolveTie(
  eventId: string,
  advancingPlayerId: string,
  excludedPlayerIds: string[],
): Promise<GenerateSEStageResult> {
  await setEntryAdvancesToSE(eventId, [
    { playerProfileId: advancingPlayerId, advancesToSE: true },
    ...excludedPlayerIds.map((id) => ({ playerProfileId: id, advancesToSE: false })),
  ]);

  return generateSEStage(eventId);
}
