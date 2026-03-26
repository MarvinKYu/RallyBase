import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const playerSelect = { select: { id: true, displayName: true } } as const;

export async function findMatchesByEventId(eventId: string) {
  return prisma.match.findMany({
    where: { eventId },
    include: {
      player1: playerSelect,
      player2: playerSelect,
      winner: playerSelect,
      matchGames: { orderBy: { gameNumber: "asc" } },
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
}

export async function countMatchesByEventId(eventId: string) {
  return prisma.match.count({ where: { eventId } });
}

export async function createMatch(data: {
  eventId: string;
  round: number;
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  nextMatchId: string | null;
  status: MatchStatus;
  winnerId: string | null;
}) {
  return prisma.match.create({ data });
}

export async function updateMatchSlot(
  matchId: string,
  slot: "player1Id" | "player2Id",
  playerProfileId: string,
) {
  return prisma.match.update({
    where: { id: matchId },
    data: { [slot]: playerProfileId },
  });
}

// ── RR → SE helpers ────────────────────────────────────────────────────────────

/** Count RR matches (groupNumber IS NOT NULL) that are not yet COMPLETED. */
export async function countIncompleteRRMatches(eventId: string) {
  return prisma.match.count({
    where: {
      eventId,
      groupNumber: { not: null },
      status: { not: MatchStatus.COMPLETED },
    },
  });
}

/** Count SE matches (groupNumber IS NULL) for an event. */
export async function countSEMatches(eventId: string) {
  return prisma.match.count({
    where: { eventId, groupNumber: null },
  });
}

/**
 * Count SE matches that are IN_PROGRESS or COMPLETED (i.e. already played).
 * Used to guard against re-generating an in-flight SE bracket.
 */
export async function countActiveSEMatches(eventId: string) {
  return prisma.match.count({
    where: {
      eventId,
      groupNumber: null,
      status: { in: [MatchStatus.IN_PROGRESS, MatchStatus.AWAITING_CONFIRMATION, MatchStatus.COMPLETED] },
    },
  });
}

/** Delete all SE matches (groupNumber IS NULL) for an event. */
export async function deleteSEMatches(eventId: string) {
  return prisma.match.deleteMany({
    where: { eventId, groupNumber: null },
  });
}

/** Fetch the advancesToSE override values for all entries in an event. */
export async function findEntryAdvancementOverrides(
  eventId: string,
): Promise<Map<string, boolean>> {
  const entries = await prisma.eventEntry.findMany({
    where: { eventId, advancesToSE: { not: null } },
    select: { playerProfileId: true, advancesToSE: true },
  });
  const map = new Map<string, boolean>();
  for (const e of entries) {
    if (e.advancesToSE !== null) map.set(e.playerProfileId, e.advancesToSE);
  }
  return map;
}

/** Stamp SE seeds on the advancing entries (in seed order). */
export async function stampEntrySeeds(
  seeds: { eventId: string; playerProfileId: string; seed: number }[],
) {
  await prisma.$transaction(
    seeds.map(({ eventId, playerProfileId, seed }) =>
      prisma.eventEntry.update({
        where: { eventId_playerProfileId: { eventId, playerProfileId } },
        data: { seed },
      }),
    ),
  );
}

/** Clear seeds for all entries in an event (used during SE re-generation). */
export async function clearEntrySeeds(eventId: string) {
  return prisma.eventEntry.updateMany({
    where: { eventId },
    data: { seed: null },
  });
}

/** Set the advancesToSE override for specific entries. */
export async function setEntryAdvancesToSE(
  eventId: string,
  updates: { playerProfileId: string; advancesToSE: boolean }[],
) {
  await prisma.$transaction(
    updates.map(({ playerProfileId, advancesToSE }) =>
      prisma.eventEntry.update({
        where: { eventId_playerProfileId: { eventId, playerProfileId } },
        data: { advancesToSE },
      }),
    ),
  );
}

/** Find the maximum round among SE matches (groupNumber IS NULL) for seTotalRounds. */
export async function findSETotalRounds(eventId: string): Promise<number | null> {
  const result = await prisma.match.aggregate({
    where: { eventId, groupNumber: null },
    _max: { round: true },
  });
  return result._max.round;
}
