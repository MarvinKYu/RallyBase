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

export type SortField = "rating" | "lastName" | "firstName";
export type SortDir = "asc" | "desc";

export interface PlayerSearchOptions {
  sort?: SortField;
  rDir?: SortDir;
  lDir?: SortDir;
  fDir?: SortDir;
  page?: number;
  pageSize?: number;
  sortRatingCategoryId?: string;
  excludeIds?: string[];
}

export interface PlayerSearchResult {
  players: Awaited<ReturnType<typeof searchProfiles>>;
  total: number;
  totalPages: number;
  page: number;
}

function sortPlayerProfiles<T extends { displayName: string; playerRatings: { ratingCategoryId: string; rating: number }[] }>(
  players: T[],
  sort: SortField,
  dirs: { rDir: SortDir; lDir: SortDir; fDir: SortDir },
  sortRatingCategoryId?: string,
): T[] {
  const dir = sort === "rating" ? dirs.rDir : sort === "lastName" ? dirs.lDir : dirs.fDir;
  return [...players].sort((a, b) => {
    let cmp = 0;
    if (sort === "rating") {
      const rA = sortRatingCategoryId
        ? (a.playerRatings.find((r) => r.ratingCategoryId === sortRatingCategoryId)?.rating ?? -1)
        : -1;
      const rB = sortRatingCategoryId
        ? (b.playerRatings.find((r) => r.ratingCategoryId === sortRatingCategoryId)?.rating ?? -1)
        : -1;
      cmp = rA - rB;
    } else if (sort === "lastName") {
      const lastA = (a.displayName.split(" ").pop() ?? a.displayName).toLowerCase();
      const lastB = (b.displayName.split(" ").pop() ?? b.displayName).toLowerCase();
      cmp = lastA.localeCompare(lastB);
    } else {
      const firstA = (a.displayName.split(" ")[0] ?? a.displayName).toLowerCase();
      const firstB = (b.displayName.split(" ")[0] ?? b.displayName).toLowerCase();
      cmp = firstA.localeCompare(firstB);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export async function searchPlayers(
  query: string,
  filters?: Omit<ProfileFilters, "query">,
  options?: PlayerSearchOptions,
): Promise<PlayerSearchResult> {
  const q = query.trim();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? 10;
  const sort = options?.sort ?? "rating";
  const rDir = options?.rDir ?? "desc";
  const lDir = options?.lDir ?? "asc";
  const fDir = options?.fDir ?? "asc";
  const sortRatingCategoryId = options?.sortRatingCategoryId;

  const allPlayers = await searchProfiles({ query: q || undefined, ...filters });
  const excludeSet = options?.excludeIds ? new Set(options.excludeIds) : null;
  const filtered = excludeSet ? allPlayers.filter((p) => !excludeSet.has(p.id)) : allPlayers;
  const sorted = sortPlayerProfiles(filtered, sort, { rDir, lDir, fDir }, sortRatingCategoryId);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const players = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { players, total, totalPages, page: safePage };
}
