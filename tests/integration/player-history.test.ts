import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, MatchStatus } from "@prisma/client";
import { getPlayerMatchHistory, getPlayerMatchesForTournament } from "@/server/services/player.service";
import { getPlayerRatingHistories } from "@/server/services/rating.service";

const prisma = new PrismaClient();

const CLERK_IDS = ["test_ph_p1", "test_ph_p2"];
const EMAILS = ["ph_p1@rallybase.test", "ph_p2@rallybase.test"];

const profileIds: string[] = [];
let tournamentId: string;
let eventId: string;
let matchId: string;

beforeAll(async () => {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No org found — run seed first");
  const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org.id } });
  if (!category) throw new Error("No rating category found — run seed first");

  // Create two test users + profiles
  for (let i = 0; i < 2; i++) {
    const user = await prisma.user.upsert({
      where: { clerkId: CLERK_IDS[i] },
      update: {},
      create: { clerkId: CLERK_IDS[i], email: EMAILS[i], name: `PH Player ${i + 1}` },
    });
    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: `PH Player ${i + 1}` },
    });
    profileIds[i] = profile.id;
  }

  // Create tournament + event
  const tournament = await prisma.tournament.create({
    data: { organizationId: org.id, name: "PH Test Tournament", startDate: new Date("2026-09-01") },
  });
  tournamentId = tournament.id;

  const event = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      name: "PH Test Event",
      format: "BEST_OF_5",
      eventFormat: "SINGLE_ELIMINATION",
      gamePointTarget: 11,
      ratingCategoryId: category.id,
    },
  });
  eventId = event.id;

  // Create a completed match with games and rating transactions
  const match = await prisma.match.create({
    data: {
      eventId: event.id,
      round: 1,
      position: 1,
      player1Id: profileIds[0],
      player2Id: profileIds[1],
      status: MatchStatus.COMPLETED,
      winnerId: profileIds[0],
    },
  });
  matchId = match.id;

  await prisma.matchGame.createMany({
    data: [
      { matchId: match.id, gameNumber: 1, player1Points: 11, player2Points: 5 },
      { matchId: match.id, gameNumber: 2, player1Points: 11, player2Points: 7 },
      { matchId: match.id, gameNumber: 3, player1Points: 5, player2Points: 11 },
      { matchId: match.id, gameNumber: 4, player1Points: 11, player2Points: 9 },
    ],
  });

  await prisma.ratingTransaction.createMany({
    data: [
      {
        playerProfileId: profileIds[0],
        ratingCategoryId: category.id,
        matchId: match.id,
        ratingBefore: 1500,
        ratingAfter: 1516,
        delta: 16,
      },
      {
        playerProfileId: profileIds[1],
        ratingCategoryId: category.id,
        matchId: match.id,
        ratingBefore: 1500,
        ratingAfter: 1484,
        delta: -16,
      },
    ],
  });
});

afterAll(async () => {
  if (matchId) {
    await prisma.ratingTransaction.deleteMany({ where: { matchId } });
    await prisma.matchGame.deleteMany({ where: { matchId } });
    await prisma.match.deleteMany({ where: { id: matchId } });
  }
  if (eventId) {
    await prisma.eventEntry.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } }).catch(() => {});
  }
  if (tournamentId) {
    await prisma.tournament.delete({ where: { id: tournamentId } }).catch(() => {});
  }
  for (const clerkId of CLERK_IDS) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) {
      const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
      if (profile) {
        await prisma.ratingTransaction.deleteMany({ where: { playerProfileId: profile.id } });
        await prisma.playerRating.deleteMany({ where: { playerProfileId: profile.id } });
        await prisma.playerProfile.delete({ where: { id: profile.id } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
  await prisma.$disconnect();
});

describe("getPlayerMatchHistory", () => {
  it("returns completed matches with correct W/L, score, delta, and opponent ratingBefore", async () => {
    const history = await getPlayerMatchHistory(profileIds[0]);

    expect(history.length).toBeGreaterThanOrEqual(1);
    const match = history.find((m) => m.id === matchId);
    expect(match).toBeDefined();
    expect(match!.winnerId).toBe(profileIds[0]);
    expect(match!.matchGames).toHaveLength(4);
    expect(match!.ratingTransactions).toHaveLength(2);
    const myTx = match!.ratingTransactions.find((tx) => tx.playerProfileId === profileIds[0]);
    const oppTx = match!.ratingTransactions.find((tx) => tx.playerProfileId !== profileIds[0]);
    expect(myTx?.delta).toBe(16);
    expect(oppTx?.ratingBefore).toBe(1500);
  });

  it("returns both players' transactions for the match", async () => {
    const history = await getPlayerMatchHistory(profileIds[1]);
    const match = history.find((m) => m.id === matchId);
    expect(match).toBeDefined();
    expect(match!.ratingTransactions).toHaveLength(2);
    const myTx = match!.ratingTransactions.find((tx) => tx.playerProfileId === profileIds[1]);
    expect(myTx?.delta).toBe(-16);
  });

  it("does not return non-COMPLETED matches", async () => {
    // Create a pending match
    const pendingMatch = await prisma.match.create({
      data: {
        eventId,
        round: 2,
        position: 1,
        player1Id: profileIds[0],
        player2Id: profileIds[1],
        status: MatchStatus.PENDING,
      },
    });

    const history = await getPlayerMatchHistory(profileIds[0]);
    expect(history.find((m) => m.id === pendingMatch.id)).toBeUndefined();

    await prisma.match.delete({ where: { id: pendingMatch.id } });
  });
});

describe("getPlayerMatchesForTournament", () => {
  it("returns matches for the queried player in the tournament", async () => {
    const matches = await getPlayerMatchesForTournament(profileIds[0], tournamentId);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const m = matches.find((x) => x.id === matchId);
    expect(m).toBeDefined();
  });

  it("does not return matches from a different tournament", async () => {
    // Create a second tournament + event + match to verify isolation
    const org = await prisma.organization.findFirst();
    const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org!.id } });
    const otherTournament = await prisma.tournament.create({
      data: { organizationId: org!.id, name: "PH Other Tournament", startDate: new Date("2026-12-01") },
    });
    const otherEvent = await prisma.event.create({
      data: {
        tournamentId: otherTournament.id,
        name: "PH Other Event",
        format: "BEST_OF_3",
        eventFormat: "SINGLE_ELIMINATION",
        gamePointTarget: 11,
        ratingCategoryId: category!.id,
      },
    });
    const otherMatch = await prisma.match.create({
      data: {
        eventId: otherEvent.id,
        round: 1,
        position: 1,
        player1Id: profileIds[0],
        player2Id: profileIds[1],
        status: MatchStatus.COMPLETED,
        winnerId: profileIds[0],
      },
    });

    // Should not appear in the original tournament query
    const matches = await getPlayerMatchesForTournament(profileIds[0], tournamentId);
    expect(matches.find((x) => x.id === otherMatch.id)).toBeUndefined();

    // Cleanup
    await prisma.match.delete({ where: { id: otherMatch.id } });
    await prisma.event.delete({ where: { id: otherEvent.id } });
    await prisma.tournament.delete({ where: { id: otherTournament.id } });
  });

  it("returns the match from both player1 and player2 perspectives", async () => {
    const p1Matches = await getPlayerMatchesForTournament(profileIds[0], tournamentId);
    const p2Matches = await getPlayerMatchesForTournament(profileIds[1], tournamentId);
    expect(p1Matches.find((x) => x.id === matchId)).toBeDefined();
    expect(p2Matches.find((x) => x.id === matchId)).toBeDefined();
  });
});

describe("getPlayerRatingHistories", () => {
  it("returns all transactions in chronological order", async () => {
    const histories = await getPlayerRatingHistories(profileIds[0]);
    expect(histories.length).toBeGreaterThanOrEqual(1);
    // Verify chronological ordering
    for (let i = 1; i < histories.length; i++) {
      expect(new Date(histories[i].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(histories[i - 1].createdAt).getTime(),
      );
    }
  });

  it("includes ratingCategory with organization info", async () => {
    const histories = await getPlayerRatingHistories(profileIds[0]);
    const tx = histories[0];
    expect(tx.ratingCategory).toBeDefined();
    expect(tx.ratingCategory.name).toBeTruthy();
    expect(tx.ratingCategory.organization.name).toBeTruthy();
  });

  it("returns only transactions for the queried player", async () => {
    const p0Histories = await getPlayerRatingHistories(profileIds[0]);
    const p1Histories = await getPlayerRatingHistories(profileIds[1]);
    const p0Ids = new Set(p0Histories.map((t) => t.playerProfileId));
    const p1Ids = new Set(p1Histories.map((t) => t.playerProfileId));
    expect(p0Ids.has(profileIds[1])).toBe(false);
    expect(p1Ids.has(profileIds[0])).toBe(false);
  });
});
