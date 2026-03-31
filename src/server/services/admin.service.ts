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

// ── Tournament creator allowlist ───────────────────────────────────────────────

/**
 * Returns true if the given user is authorized to create tournaments in the given org.
 * Authorized when: platform admin, OR org admin for the org, OR on the allowlist,
 * OR the org slug is "rallybase" (open to all authenticated users).
 */
export async function canCreateTournamentInOrg(clerkId: string, organizationId: string): Promise<boolean> {
  if (await isPlatformAdmin(clerkId)) return true;
  if (await isOrgAdminForOrg(clerkId, organizationId)) return true;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  });
  if (org?.slug === "rallybase") return true;

  const user = await findUserByClerkId(clerkId);
  if (!user) return false;
  const entry = await prisma.tournamentCreatorAllowlist.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    select: { id: true },
  });
  return !!entry;
}

/**
 * Returns the orgs the given user is authorized to create tournaments in.
 * Platform admin → all orgs. Others → org admin orgs + allowlisted orgs + RallyBase.
 */
export async function getOrgsForTournamentCreation(clerkId: string) {
  if (await isPlatformAdmin(clerkId)) {
    return prisma.organization.findMany({ orderBy: { name: "asc" } });
  }

  const user = await findUserByClerkId(clerkId);
  if (!user) return [];

  const [orgAdminRows, allowlistRows, rallybaseOrg] = await Promise.all([
    prisma.orgAdmin.findMany({ where: { userId: user.id }, select: { organizationId: true } }),
    prisma.tournamentCreatorAllowlist.findMany({ where: { userId: user.id }, select: { organizationId: true } }),
    prisma.organization.findUnique({ where: { slug: "rallybase" }, select: { id: true } }),
  ]);

  const orgIds = new Set([
    ...orgAdminRows.map((r) => r.organizationId),
    ...allowlistRows.map((r) => r.organizationId),
    ...(rallybaseOrg ? [rallybaseOrg.id] : []),
  ]);

  if (orgIds.size === 0) return [];
  return prisma.organization.findMany({
    where: { id: { in: Array.from(orgIds) } },
    orderBy: { name: "asc" },
  });
}

const adminPageUserSelect = {
  id: true,
  name: true,
  email: true,
  playerProfile: { select: { id: true, displayName: true, playerNumber: true } },
} as const;

const adminPageOrgInclude = {
  orgAdmins: {
    include: { user: { select: adminPageUserSelect } },
    orderBy: { createdAt: "asc" as const },
  },
  tournamentCreatorAllowlist: {
    include: { user: { select: adminPageUserSelect } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

/**
 * Returns orgs and admin/allowlist data for the admin dashboard page.
 * Platform admins see all orgs; org admins see only their managed orgs.
 */
export async function listOrgsForAdminPage(clerkId: string) {
  const platformAdmin = await isPlatformAdmin(clerkId);

  if (platformAdmin) {
    const orgs = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: adminPageOrgInclude,
    });
    return { platformAdmin: true as const, orgs };
  }

  const user = await findUserByClerkId(clerkId);
  if (!user) return { platformAdmin: false as const, orgs: [] };

  const managed = await prisma.orgAdmin.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  if (managed.length === 0) return { platformAdmin: false as const, orgs: [] };

  const orgs = await prisma.organization.findMany({
    where: { id: { in: managed.map((r) => r.organizationId) } },
    orderBy: { name: "asc" },
    include: adminPageOrgInclude,
  });
  return { platformAdmin: false as const, orgs };
}

export async function assignTournamentCreator(targetUserId: string, organizationId: string) {
  return prisma.tournamentCreatorAllowlist.upsert({
    where: { userId_organizationId: { userId: targetUserId, organizationId } },
    update: {},
    create: { userId: targetUserId, organizationId },
  });
}

export async function removeTournamentCreator(allowlistEntryId: string) {
  return prisma.tournamentCreatorAllowlist.delete({ where: { id: allowlistEntryId } });
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
