import { Gender, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const profileInclude = {
  user: { select: { clerkId: true } },
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
    include: profileInclude,
  });
}

export async function findProfileById(id: string) {
  return prisma.playerProfile.findUnique({
    where: { id },
    include: profileInclude,
  });
}

export async function createProfile(
  userId: string,
  data: { displayName: string; bio?: string; gender?: Gender; birthDate?: Date },
) {
  return prisma.playerProfile.create({
    data: { userId, ...data },
  });
}

export interface ProfileFilters {
  query?: string;
  organizationId?: string;
  ratingCategoryId?: string;
  gender?: Gender;
}

export async function searchProfiles(filters: ProfileFilters) {
  const { query, organizationId, ratingCategoryId, gender } = filters;

  // Build where clause
  const where: Prisma.PlayerProfileWhereInput = {};

  // Text / number search
  if (query) {
    const isNumeric = /^\d+$/.test(query.trim());
    if (isNumeric) {
      where.OR = [
        { displayName: { contains: query, mode: "insensitive" } },
        { playerNumber: { equals: parseInt(query, 10) } },
      ];
    } else {
      where.displayName = { contains: query, mode: "insensitive" };
    }
  }

  // Gender filter
  if (gender) {
    where.gender = gender;
  }

  // Organization / rating category filter — match players who have a rating in that org/category
  if (ratingCategoryId) {
    where.playerRatings = { some: { ratingCategoryId } };
  } else if (organizationId) {
    where.playerRatings = {
      some: { ratingCategory: { organizationId } },
    };
  }

  return prisma.playerProfile.findMany({
    where,
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
