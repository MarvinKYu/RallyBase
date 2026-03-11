import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getPlayerRatings, getRatingHistoryForPlayer, applyRatingResult } from "@/server/services/rating.service";

const prisma = new PrismaClient();

// Stable test identifiers so cleanup is reliable across runs
const WINNER_CLERK_ID = "test_phase3_rating_winner";
const LOSER_CLERK_ID = "test_phase3_rating_loser";
const WINNER_EMAIL = "phase3winner@rallybase.test";
const LOSER_EMAIL = "phase3loser@rallybase.test";

let winnerProfileId: string;
let loserProfileId: string;
let ratingCategoryId: string;

afterAll(async () => {
  // Clean up in dependency order
  for (const clerkId of [WINNER_CLERK_ID, LOSER_CLERK_ID]) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) {
      const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
      if (profile) {
        await prisma.ratingTransaction.deleteMany({ where: { playerProfileId: profile.id } });
        await prisma.playerRating.deleteMany({ where: { playerProfileId: profile.id } });
        await prisma.playerProfile.delete({ where: { id: profile.id } });
      }
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
  await prisma.$disconnect();
});

async function setupTestProfiles() {
  // Create winner
  const winnerUser = await prisma.user.upsert({
    where: { clerkId: WINNER_CLERK_ID },
    update: {},
    create: { clerkId: WINNER_CLERK_ID, email: WINNER_EMAIL, name: "Phase3 Winner" },
  });
  const winnerProfile = await prisma.playerProfile.upsert({
    where: { userId: winnerUser.id },
    update: {},
    create: { userId: winnerUser.id, displayName: "Phase3 Winner" },
  });

  // Create loser
  const loserUser = await prisma.user.upsert({
    where: { clerkId: LOSER_CLERK_ID },
    update: {},
    create: { clerkId: LOSER_CLERK_ID, email: LOSER_EMAIL, name: "Phase3 Loser" },
  });
  const loserProfile = await prisma.playerProfile.upsert({
    where: { userId: loserUser.id },
    update: {},
    create: { userId: loserUser.id, displayName: "Phase3 Loser" },
  });

  // Get a rating category from seed data
  const category = await prisma.ratingCategory.findFirst();
  if (!category) throw new Error("No rating categories found — run db seed first");

  return {
    winnerProfileId: winnerProfile.id,
    loserProfileId: loserProfile.id,
    ratingCategoryId: category.id,
  };
}

describe("Rating service — getPlayerRatings", () => {
  it("returns an empty array for a player with no ratings", async () => {
    const ids = await setupTestProfiles();
    winnerProfileId = ids.winnerProfileId;
    loserProfileId = ids.loserProfileId;
    ratingCategoryId = ids.ratingCategoryId;

    const ratings = await getPlayerRatings(winnerProfileId);
    expect(Array.isArray(ratings)).toBe(true);
    expect(ratings.length).toBe(0);
  });
});

describe("Rating service — applyRatingResult", () => {
  it("creates player_ratings rows for both players on first match", async () => {
    const result = await applyRatingResult({
      winnerProfileId,
      loserProfileId,
      ratingCategoryId,
    });

    expect(result.winner.delta).toBeGreaterThan(0);
    expect(result.loser.delta).toBeLessThan(0);
    expect(result.winner.ratingBefore).toBe(1500);
    expect(result.loser.ratingBefore).toBe(1500);
  });

  it("getPlayerRatings returns ratings after applyRatingResult", async () => {
    const ratings = await getPlayerRatings(winnerProfileId);
    expect(ratings.length).toBe(1);
    expect(ratings[0].rating).toBeGreaterThan(1500);
    expect(ratings[0].gamesPlayed).toBe(1);
    expect(ratings[0].ratingCategory).toBeDefined();
    expect(ratings[0].ratingCategory.organization).toBeDefined();
  });

  it("updates existing player_ratings on subsequent match", async () => {
    const ratingsBefore = await getPlayerRatings(winnerProfileId);
    const ratingBefore = ratingsBefore[0].rating;

    await applyRatingResult({
      winnerProfileId,
      loserProfileId,
      ratingCategoryId,
    });

    const ratingsAfter = await getPlayerRatings(winnerProfileId);
    expect(ratingsAfter[0].rating).not.toBe(ratingBefore);
    expect(ratingsAfter[0].gamesPlayed).toBe(2);
  });
});

describe("Rating service — getRatingHistoryForPlayer", () => {
  it("returns one transaction per applyRatingResult call", async () => {
    const history = await getRatingHistoryForPlayer(winnerProfileId, ratingCategoryId);
    // Two applyRatingResult calls happened above
    expect(history.length).toBe(2);
  });

  it("transactions are ordered newest first", async () => {
    const history = await getRatingHistoryForPlayer(winnerProfileId, ratingCategoryId);
    expect(history[0].createdAt >= history[1].createdAt).toBe(true);
  });

  it("each transaction has correct fields", async () => {
    const history = await getRatingHistoryForPlayer(winnerProfileId, ratingCategoryId);
    const tx = history[0];
    expect(tx.playerProfileId).toBe(winnerProfileId);
    expect(tx.ratingCategoryId).toBe(ratingCategoryId);
    expect(typeof tx.ratingBefore).toBe("number");
    expect(typeof tx.ratingAfter).toBe("number");
    expect(typeof tx.delta).toBe("number");
    expect(tx.delta).toBeGreaterThan(0);
  });

  it("returns empty array for a player with no history", async () => {
    const history = await getRatingHistoryForPlayer("nonexistent-profile-id", ratingCategoryId);
    expect(history).toHaveLength(0);
  });
});
