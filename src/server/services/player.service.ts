import { currentUser } from "@clerk/nextjs/server";
import { Gender, RoleName } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/server/services/admin.service";
import { createProfileSchema, updateProfileSchema } from "@/lib/schemas/player";
import { upsertUserFromClerk } from "@/server/repositories/user.repository";
import {
  findProfileByUserId,
  findProfileById,
  updatePlayerProfile as dbUpdatePlayerProfile,
  searchProfiles,
  type ProfileFilters,
} from "@/server/repositories/player.repository";
import {
  findCompletedMatchesByPlayerId,
  findMatchesByPlayerAndTournament,
} from "@/server/repositories/match.repository";

/**
 * Syncs the signed-in Clerk user to the database (lazy upsert).
 * Must be called from a server context where Clerk auth is available.
 */
export async function getOrCreateDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Not authenticated");

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email;

  return upsertUserFromClerk(clerkUser.id, email, name);
}

export type CreateProfileResult =
  | { profile: NonNullable<Awaited<ReturnType<typeof findProfileById>>> }
  | { error: string }
  | { fieldErrors: Record<string, string[]> };

/**
 * Validates input, creates a PlayerProfile, and assigns the PLAYER role.
 * Idempotent: returns an error if a profile already exists for this user.
 */
export async function createPlayerProfile(
  data: unknown,
): Promise<CreateProfileResult> {
  const parsed = createProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const dbUser = await getOrCreateDbUser();

  const existing = await findProfileByUserId(dbUser.id);
  if (existing) return { error: "You already have a player profile." };

  const profile = await prisma.$transaction(async (tx) => {
    const prof = await tx.playerProfile.create({
      data: {
        userId: dbUser.id,
        displayName: parsed.data.displayName,
        bio: parsed.data.bio,
        gender: parsed.data.gender as Gender | undefined,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
      },
    });

    const playerRole = await tx.role.findUniqueOrThrow({
      where: { name: RoleName.PLAYER },
    });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: dbUser.id, roleId: playerRole.id } },
      update: {},
      create: { userId: dbUser.id, roleId: playerRole.id },
    });

    return prof;
  });

  const fullProfile = await findProfileById(profile.id);
  return { profile: fullProfile! };
}

export async function getPlayerProfile(id: string) {
  return findProfileById(id);
}

/**
 * Returns the signed-in user's player profile, or null if they don't have one.
 * Also lazily syncs the Clerk user to the DB.
 */
export async function getMyProfile() {
  const dbUser = await getOrCreateDbUser();
  return findProfileByUserId(dbUser.id);
}

export type UpdateProfileResult =
  | { profile: NonNullable<Awaited<ReturnType<typeof findProfileById>>> }
  | { error: string }
  | { fieldErrors: Record<string, string[]> };

export async function updatePlayerProfile(
  profileId: string,
  requestingClerkId: string,
  data: unknown,
): Promise<UpdateProfileResult> {
  const profile = await findProfileById(profileId);
  if (!profile) return { error: "Profile not found." };
  if (profile.user.clerkId !== requestingClerkId && !(await isPlatformAdmin(requestingClerkId))) {
    return { error: "Not authorized." };
  }

  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { displayName, bio, gender, birthDate } = parsed.data;

  await dbUpdatePlayerProfile(profileId, {
    displayName,
    bio: bio || null,
    gender: (gender || null) as Gender | null,
    birthDate: birthDate ? new Date(birthDate) : null,
  });

  const updated = await findProfileById(profileId);
  return { profile: updated! };
}

export async function getPlayerMatchHistory(playerProfileId: string) {
  return findCompletedMatchesByPlayerId(playerProfileId);
}

export async function getPlayerMatchesForTournament(
  playerProfileId: string,
  tournamentId: string,
) {
  return findMatchesByPlayerAndTournament(playerProfileId, tournamentId);
}

export async function searchPlayers(
  query: string,
  filters?: Omit<ProfileFilters, "query">,
) {
  const q = query.trim();
  const hasFilters =
    !!filters?.organizationId ||
    !!filters?.ratingCategoryId ||
    !!filters?.gender ||
    !!filters?.minAge ||
    !!filters?.maxAge;

  if (!q && !hasFilters) return [];
  return searchProfiles({ query: q || undefined, ...filters });
}
