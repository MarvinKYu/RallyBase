import { Gender, Prisma, TournamentStatus } from "@prisma/client";
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

export async function findProfileIdByClerkId(clerkId: string): Promise<string | null> {
  const profile = await prisma.playerProfile.findFirst({
    where: { user: { clerkId } },
    select: { id: true },
  });
  return profile?.id ?? null;
}

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

export async function updatePlayerProfile(
  id: string,
  data: { displayName: string; bio?: string | null; gender?: Gender | null; showGender?: boolean; showAge?: boolean },
) {
  return prisma.playerProfile.update({ where: { id }, data });
}

export async function hasActiveEventEntries(profileId: string): Promise<boolean> {
  const count = await prisma.eventEntry.count({
    where: {
      playerProfileId: profileId,
      event: { tournament: { status: TournamentStatus.IN_PROGRESS } },
    },
  });
  return count > 0;
}

export interface ProfileFilters {
  query?: string;
  organizationId?: string;
  ratingCategoryId?: string;
  gender?: Gender;
  minAge?: number;
  maxAge?: number;
}

export async function searchProfiles(filters: ProfileFilters) {
  const { query, organizationId, ratingCategoryId, gender, minAge, maxAge } = filters;

  // Build where clause
  const where: Prisma.PlayerProfileWhereInput = { isDeleted: false };

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

  // Age range filter (computed from birthDate)
  if (minAge !== undefined || maxAge !== undefined) {
    const today = new Date();
    where.birthDate = {};
    if (minAge !== undefined) {
      // Must be at least minAge: born on or before today - minAge years
      where.birthDate.lte = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    }
    if (maxAge !== undefined) {
      // Must be at most maxAge: born on or after today - (maxAge + 1) years + 1 day
      const cutoff = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());
      cutoff.setDate(cutoff.getDate() + 1);
      where.birthDate.gte = cutoff;
    }
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
  });
}
