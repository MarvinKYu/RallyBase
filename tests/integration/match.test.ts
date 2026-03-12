import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateBracket, getEventBracket } from "@/server/services/bracket.service";
import { submitMatchResult, confirmMatchResult } from "@/server/services/match.service";
import { DEFAULT_RATING } from "@/server/algorithms/elo";

const prisma = new PrismaClient();

const CLERK_IDS = ["test_phase6_p1", "test_phase6_p2", "test_phase6_p3", "test_phase6_p4"];
const EMAILS = CLERK_IDS.map((id, i) => `phase6_p${i + 1}@rallybase.test`);

let eventId: string;
let tournamentId: string;
let profileIds: string[] = [];

afterAll(async () => {
  if (eventId) {
    // Order matters: transactions/games → submissions → matches → entries → event
    await prisma.ratingTransaction.deleteMany({ where: { match: { eventId } } });
    await prisma.matchGame.deleteMany({ where: { match: { eventId } } });
    await prisma.matchResultSubmissionGame.deleteMany({
      where: { submission: { match: { eventId } } },
    });
    await prisma.matchResultSubmission.deleteMany({ where: { match: { eventId } } });
    await prisma.match.deleteMany({ where: { eventId } });
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
        await prisma.playerRating.deleteMany({ where: { playerProfileId: profile.id } });
        await prisma.playerProfile.delete({ where: { id: profile.id } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
  await prisma.$disconnect();
});

async function setupBracket() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No org found — run seed first");
  const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org.id } });
  if (!category) throw new Error("No rating category found — run seed first");

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      name: "Phase6 Match Test Tournament",
      startDate: new Date("2026-08-01"),
    },
  });
  tournamentId = tournament.id;

  const event = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      ratingCategoryId: category.id,
      name: "Phase6 Singles",
      format: "BEST_OF_5",
      gamePointTarget: 11,
    },
  });
  eventId = event.id;

  for (let i = 0; i < 4; i++) {
    const user = await prisma.user.upsert({
      where: { clerkId: CLERK_IDS[i] },
      update: {},
      create: { clerkId: CLERK_IDS[i], email: EMAILS[i], name: `Phase6 Player ${i + 1}` },
    });
    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: `Phase6 Player ${i + 1}` },
    });
    profileIds[i] = profile.id;

    await prisma.eventEntry.create({
      data: { eventId: event.id, playerProfileId: profile.id, seed: i + 1 },
    });
  }

  await generateBracket(eventId);
}

// Shared state passed between tests within a describe block
let matchId: string;
let confirmationCode: string;

describe("Match result submission — full submit → confirm flow", () => {
  it("sets up bracket with 4 players", async () => {
    await setupBracket();
    const matches = await getEventBracket(eventId);
    expect(matches.length).toBe(3);
  });

  it("rejects submission from a non-player", async () => {
    const matches = await getEventBracket(eventId);
    const r1Match = matches.find((m) => m.round === 1 && m.position === 1)!;
    matchId = r1Match.id;

    const result = await submitMatchResult({
      matchId,
      submittedByProfileId: "non-existent-profile-id",
      games: [
        { player1Points: 11, player2Points: 7 },
        { player1Points: 11, player2Points: 5 },
        { player1Points: 11, player2Points: 3 },
        { player1Points: 0, player2Points: 0 },
        { player1Points: 0, player2Points: 0 },
      ],
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/not a player/i);
  });

  it("rejects an invalid game score", async () => {
    const result = await submitMatchResult({
      matchId,
      submittedByProfileId: profileIds[0],
      games: [
        { player1Points: 11, player2Points: 10 }, // invalid — no 2-point lead
        { player1Points: 11, player2Points: 5 },
        { player1Points: 11, player2Points: 3 },
        { player1Points: 0, player2Points: 0 },
        { player1Points: 0, player2Points: 0 },
      ],
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/game 1/i);
  });

  it("accepts a valid 3-0 submission by player1", async () => {
    const result = await submitMatchResult({
      matchId,
      submittedByProfileId: profileIds[0], // seed 1 = player1 in position 1
      games: [
        { player1Points: 11, player2Points: 7 },
        { player1Points: 11, player2Points: 5 },
        { player1Points: 11, player2Points: 3 },
        { player1Points: 0, player2Points: 0 },
        { player1Points: 0, player2Points: 0 },
      ],
    });
    expect("submission" in result).toBe(true);
    if ("submission" in result) {
      confirmationCode = result.submission.confirmationCode;
      expect(confirmationCode).toBeTruthy();
    }
  });

  it("match status is AWAITING_CONFIRMATION after submission", async () => {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    expect(match?.status).toBe("AWAITING_CONFIRMATION");
  });

  it("rejects a second submission while one is pending", async () => {
    const result = await submitMatchResult({
      matchId,
      submittedByProfileId: profileIds[3], // player2 in this match
      games: [
        { player1Points: 11, player2Points: 7 },
        { player1Points: 11, player2Points: 5 },
        { player1Points: 11, player2Points: 3 },
        { player1Points: 0, player2Points: 0 },
        { player1Points: 0, player2Points: 0 },
      ],
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/already pending/i);
  });

  it("rejects confirmation with a wrong code", async () => {
    const result = await confirmMatchResult({
      matchId,
      confirmationCode: "definitely-wrong-code",
      confirmingProfileId: profileIds[3],
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/invalid.*code/i);
  });

  it("rejects confirmation by the submitter themselves", async () => {
    const result = await confirmMatchResult({
      matchId,
      confirmationCode,
      confirmingProfileId: profileIds[0], // same as submitter
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/cannot confirm your own/i);
  });

  it("accepts confirmation by the opposing player", async () => {
    const result = await confirmMatchResult({
      matchId,
      confirmationCode,
      confirmingProfileId: profileIds[3], // seed 4 = player2 in position 1
    });
    expect("success" in result).toBe(true);
    if ("success" in result) {
      expect(result.tournamentId).toBe(tournamentId);
      expect(result.eventId).toBe(eventId);
    }
  });

  it("match is COMPLETED with the correct winner", async () => {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    expect(match?.status).toBe("COMPLETED");
    expect(match?.winnerId).toBe(profileIds[0]); // player1 won 3-0
  });

  it("MatchGame records are created for played games only (3 games)", async () => {
    const games = await prisma.matchGame.findMany({
      where: { matchId },
      orderBy: { gameNumber: "asc" },
    });
    expect(games).toHaveLength(3);
    expect(games[0]).toMatchObject({ gameNumber: 1, player1Points: 11, player2Points: 7 });
    expect(games[1]).toMatchObject({ gameNumber: 2, player1Points: 11, player2Points: 5 });
    expect(games[2]).toMatchObject({ gameNumber: 3, player1Points: 11, player2Points: 3 });
  });

  it("winner is advanced to the correct slot in the final", async () => {
    const matches = await getEventBracket(eventId);
    const final = matches.find((m) => m.round === 2)!;
    // Position 1 → odd → player1Id slot in the final
    expect(final.player1Id).toBe(profileIds[0]);
  });

  it("winner's rating increases and loser's rating decreases", async () => {
    const category = await prisma.ratingCategory.findFirst({
      where: { events: { some: { id: eventId } } },
    });

    const [winnerRating, loserRating] = await Promise.all([
      prisma.playerRating.findUnique({
        where: {
          playerProfileId_ratingCategoryId: {
            playerProfileId: profileIds[0],
            ratingCategoryId: category!.id,
          },
        },
      }),
      prisma.playerRating.findUnique({
        where: {
          playerProfileId_ratingCategoryId: {
            playerProfileId: profileIds[3],
            ratingCategoryId: category!.id,
          },
        },
      }),
    ]);

    expect(winnerRating).not.toBeNull();
    expect(loserRating).not.toBeNull();
    expect(winnerRating!.rating).toBeGreaterThan(DEFAULT_RATING);
    expect(loserRating!.rating).toBeLessThan(DEFAULT_RATING);
    expect(winnerRating!.gamesPlayed).toBe(1);
    expect(loserRating!.gamesPlayed).toBe(1);
  });

  it("rating transactions are inserted for both players", async () => {
    const category = await prisma.ratingCategory.findFirst({
      where: { events: { some: { id: eventId } } },
    });

    const [winnerTx, loserTx] = await Promise.all([
      prisma.ratingTransaction.findFirst({
        where: { playerProfileId: profileIds[0], matchId },
      }),
      prisma.ratingTransaction.findFirst({
        where: { playerProfileId: profileIds[3], matchId },
      }),
    ]);

    expect(winnerTx).not.toBeNull();
    expect(loserTx).not.toBeNull();

    // Winner delta is positive, loser delta is negative
    expect(winnerTx!.delta).toBeGreaterThan(0);
    expect(loserTx!.delta).toBeLessThan(0);

    // Before = DEFAULT_RATING for both (first match)
    expect(winnerTx!.ratingBefore).toBe(DEFAULT_RATING);
    expect(loserTx!.ratingBefore).toBe(DEFAULT_RATING);

    // After = before + delta
    expect(winnerTx!.ratingAfter).toBe(DEFAULT_RATING + winnerTx!.delta);
    expect(loserTx!.ratingAfter).toBe(DEFAULT_RATING + loserTx!.delta);

    // Deltas are equal and opposite
    expect(winnerTx!.delta).toBe(-loserTx!.delta);

    // Transactions are linked to the match
    expect(winnerTx!.matchId).toBe(matchId);
    expect(loserTx!.matchId).toBe(matchId);
    expect(winnerTx!.ratingCategoryId).toBe(category!.id);
  });

  it("rejects a third attempt to submit after match is completed", async () => {
    const result = await submitMatchResult({
      matchId,
      submittedByProfileId: profileIds[0],
      games: [
        { player1Points: 11, player2Points: 7 },
        { player1Points: 11, player2Points: 5 },
        { player1Points: 11, player2Points: 3 },
        { player1Points: 0, player2Points: 0 },
        { player1Points: 0, player2Points: 0 },
      ],
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/already completed/i);
  });
});

describe("Match result submission — BEST_OF_3 format", () => {
  let bo3EventId: string;
  let bo3MatchId: string;
  let bo3Code: string;
  let bo3Profiles: string[] = [];

  afterAll(async () => {
    if (bo3EventId) {
      await prisma.matchGame.deleteMany({ where: { match: { eventId: bo3EventId } } });
      await prisma.matchResultSubmissionGame.deleteMany({
        where: { submission: { match: { eventId: bo3EventId } } },
      });
      await prisma.matchResultSubmission.deleteMany({ where: { match: { eventId: bo3EventId } } });
      await prisma.match.deleteMany({ where: { eventId: bo3EventId } });
      await prisma.eventEntry.deleteMany({ where: { eventId: bo3EventId } });
      await prisma.event.delete({ where: { id: bo3EventId } }).catch(() => {});
    }
  });

  it("confirms a 2-1 result in BEST_OF_3", async () => {
    // Create a 2-player BEST_OF_3 event so we get a single match
    const org = await prisma.organization.findFirst();
    const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org!.id } });

    const event = await prisma.event.create({
      data: {
        tournamentId,
        ratingCategoryId: category!.id,
        name: "Phase6 BO3 Singles",
        format: "BEST_OF_3",
        gamePointTarget: 11,
      },
    });
    bo3EventId = event.id;

    // Reuse first two profiles already created
    bo3Profiles = [profileIds[0], profileIds[1]];
    for (let i = 0; i < 2; i++) {
      await prisma.eventEntry.create({
        data: { eventId: event.id, playerProfileId: bo3Profiles[i], seed: i + 1 },
      });
    }

    await generateBracket(event.id);
    const matches = await getEventBracket(event.id);
    // 2-player bracket: 1 match (the final itself)
    expect(matches.length).toBe(1);
    bo3MatchId = matches[0].id;

    // Submit a 2-1 result
    const submitResult = await submitMatchResult({
      matchId: bo3MatchId,
      submittedByProfileId: bo3Profiles[0],
      games: [
        { player1Points: 11, player2Points: 8 },
        { player1Points: 7, player2Points: 11 },
        { player1Points: 11, player2Points: 9 },
      ],
    });
    expect("submission" in submitResult).toBe(true);
    if ("submission" in submitResult) bo3Code = submitResult.submission.confirmationCode;

    const confirmResult = await confirmMatchResult({
      matchId: bo3MatchId,
      confirmationCode: bo3Code,
      confirmingProfileId: bo3Profiles[1],
    });
    expect("success" in confirmResult).toBe(true);

    const match = await prisma.match.findUnique({ where: { id: bo3MatchId } });
    expect(match?.status).toBe("COMPLETED");
    expect(match?.winnerId).toBe(bo3Profiles[0]);

    const games = await prisma.matchGame.findMany({
      where: { matchId: bo3MatchId },
      orderBy: { gameNumber: "asc" },
    });
    expect(games).toHaveLength(3);
  });
});
