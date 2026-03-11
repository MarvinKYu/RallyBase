import { prisma } from "@/lib/prisma";

const ratingCategoryInclude = {
  ratingCategory: {
    include: {
      organization: true,
      discipline: true,
    },
  },
} as const;

export async function findPlayerRatingsByProfileId(playerProfileId: string) {
  return prisma.playerRating.findMany({
    where: { playerProfileId },
    include: ratingCategoryInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function findPlayerRatingByCategory(
  playerProfileId: string,
  ratingCategoryId: string,
) {
  return prisma.playerRating.findUnique({
    where: {
      playerProfileId_ratingCategoryId: { playerProfileId, ratingCategoryId },
    },
  });
}

export async function findRatingTransactionsByProfileAndCategory(
  playerProfileId: string,
  ratingCategoryId: string,
) {
  return prisma.ratingTransaction.findMany({
    where: { playerProfileId, ratingCategoryId },
    orderBy: { createdAt: "desc" },
  });
}
