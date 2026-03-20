import { MatchStatus, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const playerSelect = { select: { id: true, displayName: true } } as const;

export async function findMatchById(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      player1: playerSelect,
      player2: playerSelect,
      winner: playerSelect,
      event: {
        select: {
          id: true,
          status: true,
          format: true,
          eventFormat: true,
          gamePointTarget: true,
          ratingCategoryId: true,
          tournament: { select: { id: true, name: true, createdByClerkId: true } },
        },
      },
      submissions: {
        where: { status: SubmissionStatus.PENDING },
        include: {
          submittedBy: playerSelect,
          games: { orderBy: { gameNumber: "asc" } },
        },
        take: 1,
      },
      matchGames: { orderBy: { gameNumber: "asc" } },
    },
  });
}

export async function findSubmissionByCode(confirmationCode: string) {
  return prisma.matchResultSubmission.findUnique({
    where: { confirmationCode },
    include: {
      submittedBy: playerSelect,
      games: { orderBy: { gameNumber: "asc" } },
      match: {
        include: {
          player1: playerSelect,
          player2: playerSelect,
          event: {
            select: {
              id: true,
              status: true,
              format: true,
              gamePointTarget: true,
              ratingCategoryId: true,
              tournament: { select: { id: true } },
            },
          },
        },
      },
    },
  });
}

export async function createSubmission(data: {
  matchId: string;
  submittedById: string;
  confirmationCode: string;
  games: Array<{ gameNumber: number; player1Points: number; player2Points: number }>;
}) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.matchResultSubmission.create({
      data: {
        matchId: data.matchId,
        submittedById: data.submittedById,
        confirmationCode: data.confirmationCode,
        games: { create: data.games },
      },
    });

    await tx.match.update({
      where: { id: data.matchId },
      data: { status: MatchStatus.AWAITING_CONFIRMATION },
    });

    return submission;
  });
}

export async function saveMatchProgressScores(
  matchId: string,
  games: Array<{ gameNumber: number; player1Points: number; player2Points: number }>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.matchGame.deleteMany({ where: { matchId } });
    if (games.length > 0) {
      await tx.matchGame.createMany({
        data: games.map((g) => ({ matchId, ...g })),
      });
    }
    await tx.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.IN_PROGRESS },
    });
  });
}

export async function confirmSubmission(data: {
  submissionId: string;
  matchId: string;
  winnerId: string;
  nextMatchId: string | null;
  nextMatchSlot: "player1Id" | "player2Id" | null;
  games: Array<{ gameNumber: number; player1Points: number; player2Points: number }>;
}) {
  return prisma.$transaction(async (tx) => {
    // Mark submission CONFIRMED
    await tx.matchResultSubmission.update({
      where: { id: data.submissionId },
      data: { status: SubmissionStatus.CONFIRMED, confirmedAt: new Date() },
    });

    // Clear any in-progress saves before writing official scores
    await tx.matchGame.deleteMany({ where: { matchId: data.matchId } });

    // Write official per-game scores
    await tx.matchGame.createMany({
      data: data.games.map((g) => ({ matchId: data.matchId, ...g })),
    });

    // Complete the match
    await tx.match.update({
      where: { id: data.matchId },
      data: { status: MatchStatus.COMPLETED, winnerId: data.winnerId },
    });

    // Advance winner into the next bracket slot
    if (data.nextMatchId && data.nextMatchSlot) {
      await tx.match.update({
        where: { id: data.nextMatchId },
        data: { [data.nextMatchSlot]: data.winnerId },
      });
    }
  });
}

export async function directDefaultMatch(data: {
  matchId: string;
  winnerId: string;
  nextMatchId: string | null;
  nextMatchSlot: "player1Id" | "player2Id" | null;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.matchResultSubmission.deleteMany({ where: { matchId: data.matchId } });
    await tx.matchGame.deleteMany({ where: { matchId: data.matchId } });

    await tx.match.update({
      where: { id: data.matchId },
      data: { status: MatchStatus.COMPLETED, winnerId: data.winnerId, isDefault: true },
    });

    if (data.nextMatchId && data.nextMatchSlot) {
      await tx.match.update({
        where: { id: data.nextMatchId },
        data: { [data.nextMatchSlot]: data.winnerId },
      });
    }
  });
}

export async function directCompleteMatch(data: {
  matchId: string;
  winnerId: string;
  nextMatchId: string | null;
  nextMatchSlot: "player1Id" | "player2Id" | null;
  games: Array<{ gameNumber: number; player1Points: number; player2Points: number }>;
}) {
  return prisma.$transaction(async (tx) => {
    // Delete any existing submissions (TD override)
    await tx.matchResultSubmission.deleteMany({ where: { matchId: data.matchId } });

    // Delete existing game records
    await tx.matchGame.deleteMany({ where: { matchId: data.matchId } });

    // Write official per-game scores
    await tx.matchGame.createMany({
      data: data.games.map((g) => ({ matchId: data.matchId, ...g })),
    });

    // Complete the match
    await tx.match.update({
      where: { id: data.matchId },
      data: { status: MatchStatus.COMPLETED, winnerId: data.winnerId },
    });

    // Advance winner into the next bracket slot
    if (data.nextMatchId && data.nextMatchSlot) {
      await tx.match.update({
        where: { id: data.nextMatchId },
        data: { [data.nextMatchSlot]: data.winnerId },
      });
    }
  });
}

export async function voidMatch(matchId: string) {
  return prisma.$transaction(async (tx) => {
    // Detach rating transactions from match
    await tx.ratingTransaction.updateMany({
      where: { matchId },
      data: { matchId: null },
    });

    // Get current match to find the next match slot to clear
    const match = await tx.match.findUnique({
      where: { id: matchId },
      select: { winnerId: true, nextMatchId: true, position: true },
    });

    // Delete submissions and games
    await tx.matchResultSubmission.deleteMany({ where: { matchId } });
    await tx.matchGame.deleteMany({ where: { matchId } });

    // Reset match to pending
    await tx.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.PENDING, winnerId: null },
    });

    // Clear winner slot in next match if winner had advanced
    if (match?.nextMatchId && match.winnerId) {
      const slot = match.position % 2 === 1 ? "player1Id" : "player2Id";
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: { [slot]: null },
      });
    }
  });
}

export async function findCompletedMatchesByPlayerId(playerProfileId: string) {
  return prisma.match.findMany({
    where: {
      OR: [{ player1Id: playerProfileId }, { player2Id: playerProfileId }],
      status: "COMPLETED",
    },
    include: {
      player1: playerSelect,
      player2: playerSelect,
      winner: playerSelect,
      matchGames: { orderBy: { gameNumber: "asc" } },
      ratingTransactions: { where: { playerProfileId } },
      event: {
        select: {
          id: true,
          name: true,
          tournament: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findMatchesByPlayerAndTournament(
  playerProfileId: string,
  tournamentId: string,
) {
  return prisma.match.findMany({
    where: {
      OR: [{ player1Id: playerProfileId }, { player2Id: playerProfileId }],
      event: { tournamentId },
    },
    include: {
      player1: playerSelect,
      player2: playerSelect,
      event: { select: { id: true, name: true } },
      matchGames: { orderBy: { gameNumber: "asc" } },
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
}

export async function findMatchesByPlayerId(playerProfileId: string) {
  return prisma.match.findMany({
    where: {
      OR: [{ player1Id: playerProfileId }, { player2Id: playerProfileId }],
    },
    include: {
      player1: playerSelect,
      player2: playerSelect,
      winner: playerSelect,
      event: {
        select: {
          id: true,
          name: true,
          tournament: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ event: { tournament: { startDate: "desc" } } }, { round: "asc" }],
  });
}
