import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  findProfileByUserId,
  findProfileById,
  createProfile,
  searchProfiles,
} from "@/server/repositories/player.repository";
import { upsertUserFromClerk } from "@/server/repositories/user.repository";

const prisma = new PrismaClient();

// Stable test identifiers so cleanup is reliable across runs
const TEST_CLERK_ID = "test_phase2_player_profile";
const TEST_EMAIL = "phase2test@rallybase.test";

afterAll(async () => {
  // Clean up in dependency order
  const user = await prisma.user.findUnique({ where: { clerkId: TEST_CLERK_ID } });
  if (user) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
    if (profile) {
      await prisma.playerRating.deleteMany({ where: { playerProfileId: profile.id } });
      await prisma.playerProfile.delete({ where: { id: profile.id } });
    }
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

describe("User repository — upsertUserFromClerk", () => {
  it("creates a new user when one does not exist", async () => {
    // Pre-clean in case of leftover from a previous failed run
    const existing = await prisma.user.findUnique({ where: { clerkId: TEST_CLERK_ID } });
    if (existing) {
      await prisma.playerProfile.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await upsertUserFromClerk(TEST_CLERK_ID, TEST_EMAIL, "Phase Two Tester");
    expect(user.clerkId).toBe(TEST_CLERK_ID);
    expect(user.email).toBe(TEST_EMAIL);
    expect(user.name).toBe("Phase Two Tester");
  });

  it("updates an existing user on re-upsert", async () => {
    const updated = await upsertUserFromClerk(TEST_CLERK_ID, TEST_EMAIL, "Updated Name");
    expect(updated.name).toBe("Updated Name");
  });
});

describe("Player repository — createProfile", () => {
  it("creates a player profile linked to a user", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { clerkId: TEST_CLERK_ID } });
    const profile = await createProfile(user.id, {
      displayName: "Phase2 Player",
      bio: "Integration test profile.",
    });

    expect(profile.userId).toBe(user.id);
    expect(profile.displayName).toBe("Phase2 Player");
    expect(profile.bio).toBe("Integration test profile.");
  });
});

describe("Player repository — findProfileByUserId", () => {
  it("finds a profile by userId and includes ratings", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { clerkId: TEST_CLERK_ID } });
    const profile = await findProfileByUserId(user.id);

    expect(profile).not.toBeNull();
    expect(profile!.displayName).toBe("Phase2 Player");
    expect(Array.isArray(profile!.playerRatings)).toBe(true);
  });

  it("returns null for a userId with no profile", async () => {
    const result = await findProfileByUserId("nonexistent-user-id");
    expect(result).toBeNull();
  });
});

describe("Player repository — findProfileById", () => {
  it("finds a profile by its own ID", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { clerkId: TEST_CLERK_ID } });
    const byUser = await findProfileByUserId(user.id);
    const byId = await findProfileById(byUser!.id);

    expect(byId).not.toBeNull();
    expect(byId!.id).toBe(byUser!.id);
    expect(byId!.displayName).toBe("Phase2 Player");
  });

  it("returns null for a non-existent profile ID", async () => {
    const result = await findProfileById("nonexistent-profile-id");
    expect(result).toBeNull();
  });
});

describe("Player repository — searchProfiles", () => {
  it("finds a profile by exact display name", async () => {
    const results = await searchProfiles({ query: "Phase2 Player" });
    expect(results.some((p) => p.displayName === "Phase2 Player")).toBe(true);
  });

  it("finds a profile by partial display name (case-insensitive)", async () => {
    const results = await searchProfiles({ query: "phase2" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns an empty array for a query with no matches", async () => {
    const results = await searchProfiles({ query: "zzz_no_match_xqz" });
    expect(results).toHaveLength(0);
  });

  it("includes playerRatings in search results", async () => {
    const results = await searchProfiles({ query: "Phase2 Player" });
    expect(Array.isArray(results[0].playerRatings)).toBe(true);
  });
});
