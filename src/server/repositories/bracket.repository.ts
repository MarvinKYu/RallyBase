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
