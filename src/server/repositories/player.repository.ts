import { prisma } from "@/lib/prisma";

const ratingsInclude = {
  playerRatings: {
    orderBy: { updatedAt: "desc" as const },
    include: {
      ratingCategory: {
        include: { organization: true },
      },
    },
  },
} as const;

export async function findProfileByUserId(userId: string) {
  return prisma.playerProfile.findUnique({
    where: { userId },
    include: ratingsInclude,
  });
}

export async function findProfileById(id: string) {
  return prisma.playerProfile.findUnique({
    where: { id },
    include: ratingsInclude,
  });
}

export async function createProfile(
  userId: string,
  data: { displayName: string; bio?: string },
) {
  return prisma.playerProfile.create({
    data: { userId, ...data },
  });
}

export async function searchProfiles(query: string) {
  return prisma.playerProfile.findMany({
    where: {
      displayName: { contains: query, mode: "insensitive" },
    },
    include: {
      playerRatings: {
        include: {
          ratingCategory: { include: { organization: true } },
        },
      },
    },
    take: 20,
    orderBy: { displayName: "asc" },
  });
}
