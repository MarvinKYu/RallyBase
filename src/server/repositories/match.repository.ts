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
          format: true,
          gamePointTarget: true,
          ratingCategoryId: true,
          tournament: { select: { id: true, name: true } },
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
              format: true,
              gamePointTarget: true,
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
  games: Array<{ gameNumber: number; player1Points: number; player2Points: number }>;
}) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.matchResultSubmission.create({
      data: {
        matchId: data.matchId,
        submittedById: data.submittedById,
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
