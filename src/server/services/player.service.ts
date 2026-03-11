import { currentUser } from "@clerk/nextjs/server";
import { RoleName } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createProfileSchema } from "@/lib/schemas/player";
import { upsertUserFromClerk } from "@/server/repositories/user.repository";
import {
  findProfileByUserId,
  findProfileById,
  searchProfiles,
} from "@/server/repositories/player.repository";

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
      data: { userId: dbUser.id, ...parsed.data },
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

export async function searchPlayers(query: string) {
  const q = query.trim();
  if (!q) return [];
  return searchProfiles(q);
}
