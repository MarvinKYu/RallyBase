import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Database connectivity", () => {
  it("connects to the database", async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
  });
});

describe("Seed data — Roles", () => {
  it("contains all 4 roles", async () => {
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    const roleNames = roles.map((r) => r.name);
    expect(roleNames).toContain(RoleName.PLAYER);
    expect(roleNames).toContain(RoleName.TOURNAMENT_DIRECTOR);
    expect(roleNames).toContain(RoleName.ORG_ADMIN);
    expect(roleNames).toContain(RoleName.PLATFORM_ADMIN);
    expect(roles).toHaveLength(4);
  });
});

describe("Seed data — Organizations", () => {
  it("contains USATT with correct slug", async () => {
    const usatt = await prisma.organization.findUnique({ where: { slug: "usatt" } });
    expect(usatt).not.toBeNull();
    expect(usatt!.name).toBe("USATT");
  });

  it("contains NCTTA with correct slug", async () => {
    const nctta = await prisma.organization.findUnique({ where: { slug: "nctta" } });
    expect(nctta).not.toBeNull();
    expect(nctta!.name).toBe("NCTTA");
  });
});

describe("Seed data — Disciplines", () => {
  it("each org has a Singles discipline", async () => {
    const usatt = await prisma.organization.findUniqueOrThrow({ where: { slug: "usatt" } });
    const nctta = await prisma.organization.findUniqueOrThrow({ where: { slug: "nctta" } });

    const usattSingles = await prisma.discipline.findUnique({
      where: { organizationId_name: { organizationId: usatt.id, name: "Singles" } },
    });
    const ncttaSingles = await prisma.discipline.findUnique({
      where: { organizationId_name: { organizationId: nctta.id, name: "Singles" } },
    });

    expect(usattSingles).not.toBeNull();
    expect(ncttaSingles).not.toBeNull();
  });
});

describe("Seed data — Rating Categories", () => {
  it("USATT has a rating category named 'USATT Singles'", async () => {
    const usatt = await prisma.organization.findUniqueOrThrow({ where: { slug: "usatt" } });
    const category = await prisma.ratingCategory.findFirst({
      where: { organizationId: usatt.id, name: "USATT Singles" },
    });
    expect(category).not.toBeNull();
  });

  it("NCTTA has a rating category named 'NCTTA Singles'", async () => {
    const nctta = await prisma.organization.findUniqueOrThrow({ where: { slug: "nctta" } });
    const category = await prisma.ratingCategory.findFirst({
      where: { organizationId: nctta.id, name: "NCTTA Singles" },
    });
    expect(category).not.toBeNull();
  });

  it("rating categories link to their org's Singles discipline", async () => {
    const categories = await prisma.ratingCategory.findMany({
      include: { discipline: true, organization: true },
    });
    for (const cat of categories) {
      expect(cat.discipline.name).toBe("Singles");
      expect(cat.discipline.organizationId).toBe(cat.organizationId);
    }
  });
});

describe("Schema integrity — PlayerRating defaults", () => {
  const TEST_CLERK_ID = "test_clerk_schema_check";

  it("new PlayerRating rows default to rating 1500 and gamesPlayed 0", async () => {
    // Clean up any leftover state from previous failed runs
    const existing = await prisma.user.findUnique({ where: { clerkId: TEST_CLERK_ID } });
    if (existing) {
      await prisma.playerProfile.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await prisma.user.create({
      data: { clerkId: TEST_CLERK_ID, email: "schemacheck@test.com", name: "Schema Check" },
    });
    const profile = await prisma.playerProfile.create({
      data: { userId: user.id, displayName: "Schema Check" },
    });
    const category = await prisma.ratingCategory.findFirstOrThrow();

    let rating;
    try {
      rating = await prisma.playerRating.create({
        data: { playerProfileId: profile.id, ratingCategoryId: category.id },
      });

      expect(rating.rating).toBe(1500);
      expect(rating.gamesPlayed).toBe(0);
    } finally {
      // Always clean up, even if assertions fail
      if (rating) await prisma.playerRating.delete({ where: { id: rating.id } });
      await prisma.playerProfile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
