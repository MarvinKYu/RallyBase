import { RoleName } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findUserByClerkId } from "@/server/repositories/user.repository";

export async function isPlatformAdmin(clerkId: string): Promise<boolean> {
  const user = await findUserByClerkId(clerkId);
  if (!user) return false;
  const role = await prisma.userRole.findFirst({
    where: { userId: user.id, role: { name: RoleName.PLATFORM_ADMIN } },
    select: { id: true },
  });
  return !!role;
}

export async function isOrgAdminForOrg(clerkId: string, organizationId: string): Promise<boolean> {
  const user = await findUserByClerkId(clerkId);
  if (!user) return false;
  const entry = await prisma.orgAdmin.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    select: { id: true },
  });
  return !!entry;
}

export async function isAdminUser(clerkId: string): Promise<boolean> {
  if (await isPlatformAdmin(clerkId)) return true;
  const user = await findUserByClerkId(clerkId);
  if (!user) return false;
  const count = await prisma.orgAdmin.count({ where: { userId: user.id } });
  return count > 0;
}

/**
 * Returns null for platform admins (meaning: all orgs), or an array of
 * organization IDs this user manages as an org admin.
 */
export async function getAdminManagedOrgIds(clerkId: string): Promise<string[] | null> {
  if (await isPlatformAdmin(clerkId)) return null;
  const user = await findUserByClerkId(clerkId);
  if (!user) return [];
  const rows = await prisma.orgAdmin.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  return rows.map((r) => r.organizationId);
}

export async function isAuthorizedAsTD(
  clerkId: string,
  tournament: { createdByClerkId: string | null; organizationId: string },
): Promise<boolean> {
  if (tournament.createdByClerkId === clerkId) return true;
  if (await isPlatformAdmin(clerkId)) return true;
  if (await isOrgAdminForOrg(clerkId, tournament.organizationId)) return true;
  return false;
}

export async function getAllRatingCategories() {
  return prisma.ratingCategory.findMany({
    include: { organization: { select: { id: true, name: true } } },
    orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getTournamentCreatorNames(clerkIds: string[]): Promise<Map<string, string>> {
  if (clerkIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { clerkId: { in: clerkIds } },
    select: { clerkId: true, playerProfile: { select: { displayName: true } } },
  });
  return new Map(users.map((u) => [u.clerkId, u.playerProfile?.displayName ?? "Unknown"]));
}

// ── Org admin management ───────────────────────────────────────────────────────

export async function listOrgAdmins(organizationId: string) {
  return prisma.orgAdmin.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          playerProfile: { select: { id: true, displayName: true, playerNumber: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listAllOrgsWithAdmins() {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      orgAdmins: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              playerProfile: { select: { id: true, displayName: true, playerNumber: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function assignOrgAdmin(targetUserId: string, organizationId: string) {
  return prisma.orgAdmin.upsert({
    where: { userId_organizationId: { userId: targetUserId, organizationId } },
    update: {},
    create: { userId: targetUserId, organizationId },
  });
}

export async function removeOrgAdmin(orgAdminId: string) {
  return prisma.orgAdmin.delete({ where: { id: orgAdminId } });
}

// ── Rating admin ───────────────────────────────────────────────────────────────

export async function adminAddInitialRating(
  profileId: string,
  ratingCategoryId: string,
  initialRating: number,
  adminClerkId: string,
): Promise<{ success: true } | { error: string }> {
  const [existing, ratingCategory] = await Promise.all([
    prisma.playerRating.findUnique({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: profileId, ratingCategoryId } },
      select: { id: true },
    }),
    prisma.ratingCategory.findUnique({
      where: { id: ratingCategoryId },
      select: { organizationId: true },
    }),
  ]);

  if (!ratingCategory) return { error: "Rating category not found." };
  if (existing) return { error: "A rating already exists for this scope. Use the edit form to update it." };

  if (!(await isPlatformAdmin(adminClerkId))) {
    if (!(await isOrgAdminForOrg(adminClerkId, ratingCategory.organizationId))) {
      return { error: "Not authorized." };
    }
  }

  await prisma.$transaction([
    prisma.playerRating.create({
      data: { playerProfileId: profileId, ratingCategoryId, rating: initialRating },
    }),
    prisma.ratingTransaction.create({
      data: {
        playerProfileId: profileId,
        ratingCategoryId,
        matchId: null,
        ratingBefore: 1500,
        ratingAfter: initialRating,
        delta: initialRating - 1500,
      },
    }),
  ]);

  return { success: true };
}

export async function adminSetPlayerRating(
  profileId: string,
  ratingCategoryId: string,
  newRating: number,
  adminClerkId: string,
): Promise<{ success: true } | { error: string }> {
  const [existing, ratingCategory] = await Promise.all([
    prisma.playerRating.findUnique({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: profileId, ratingCategoryId } },
    }),
    prisma.ratingCategory.findUnique({
      where: { id: ratingCategoryId },
      select: { organizationId: true },
    }),
  ]);

  if (!ratingCategory) return { error: "Rating category not found." };

  if (!(await isPlatformAdmin(adminClerkId))) {
    if (!(await isOrgAdminForOrg(adminClerkId, ratingCategory.organizationId))) {
      return { error: "Not authorized." };
    }
  }

  const ratingBefore = existing?.rating ?? 1500;
  const delta = newRating - ratingBefore;

  await prisma.$transaction([
    prisma.playerRating.upsert({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: profileId, ratingCategoryId } },
      update: { rating: newRating },
      create: { playerProfileId: profileId, ratingCategoryId, rating: newRating },
    }),
    prisma.ratingTransaction.create({
      data: {
        playerProfileId: profileId,
        ratingCategoryId,
        matchId: null,
        ratingBefore,
        ratingAfter: newRating,
        delta,
      },
    }),
  ]);

  return { success: true };
}
