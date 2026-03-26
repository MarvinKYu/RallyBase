/**
 * Integration tests for RR → SE hybrid bracket flow.
 * Tests generateBracket (RR phase only), generateSEStage, regenerateSEStage,
 * resolveTie, and getEventPodium for RR_TO_SE events.
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { PrismaClient, MatchStatus } from "@prisma/client";
import {
  generateBracket,
  generateSEStage,
  regenerateSEStage,
  resolveTie,
  getEventPodium,
} from "@/server/services/bracket.service";

const prisma = new PrismaClient();

// ── Test identifiers ──────────────────────────────────────────────────────────

const CLERK_IDS = Array.from({ length: 8 }, (_, i) => `test_rrse_p${i + 1}`);
const EMAILS = CLERK_IDS.map((id) => `${id}@rallybase.test`);

let tournamentId: string;
let eventId: string;
const profileIds: string[] = [];

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No org found — run seed first");
  const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org.id } });
  if (!category) throw new Error("No rating category found — run seed first");

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      name: "RR→SE Integration Test Tournament",
      startDate: new Date("2026-08-01"),
    },
  });
  tournamentId = tournament.id;

  const event = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      ratingCategoryId: category.id,
      name: "RR→SE Singles",
      eventFormat: "RR_TO_SE",
      groupSize: 4,
      advancersPerGroup: 1,
    },
  });
  eventId = event.id;

  // Create 8 players (2 groups × 4 players)
  for (let i = 0; i < 8; i++) {
    const user = await prisma.user.upsert({
      where: { clerkId: CLERK_IDS[i] },
      update: {},
      create: { clerkId: CLERK_IDS[i], email: EMAILS[i], name: `RRSE Player ${i + 1}` },
    });
    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: `RRSE Player ${i + 1}` },
    });
    profileIds[i] = profile.id;

    // Assign descending ratings so snake seeding is deterministic
    await prisma.playerRating.upsert({
      where: {
        playerProfileId_ratingCategoryId: {
          playerProfileId: profile.id,
          ratingCategoryId: category.id,
        },
      },
      update: { rating: 2000 - i * 100 },
      create: {
        playerProfileId: profile.id,
        ratingCategoryId: category.id,
        rating: 2000 - i * 100,
      },
    });

    await prisma.eventEntry.create({
      data: { eventId: event.id, playerProfileId: profile.id },
    });
  }
});

afterAll(async () => {
  if (eventId) {
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("generateBracket for RR_TO_SE", () => {
  it("creates only RR matches (all have groupNumber set)", async () => {
    await generateBracket(eventId);

    const allMatches = await prisma.match.findMany({ where: { eventId } });
    expect(allMatches.length).toBeGreaterThan(0);
    // Every match created by generateBracket for RR_TO_SE must be a RR match
    expect(allMatches.every((m) => m.groupNumber !== null)).toBe(true);
  });

  it("stamps groupNumber on EventEntry rows", async () => {
    const entries = await prisma.eventEntry.findMany({ where: { eventId } });
    expect(entries.every((e) => e.groupNumber !== null)).toBe(true);
  });
});

describe("generateSEStage — incomplete RR", () => {
  it("returns { ok: false, reason: incomplete_rr } when RR matches are not done", async () => {
    const result = await generateSEStage(eventId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("incomplete_rr");
  });

  it("creates no SE matches", async () => {
    const seMatches = await prisma.match.findMany({
      where: { eventId, groupNumber: null },
    });
    expect(seMatches).toHaveLength(0);
  });
});

describe("generateSEStage — after completing all RR matches", () => {
  beforeAll(async () => {
    // Mark all RR matches as COMPLETED with a winner
    const rrMatches = await prisma.match.findMany({
      where: { eventId, groupNumber: { not: null } },
    });
    for (const m of rrMatches) {
      if (m.player1Id && m.player2Id) {
        await prisma.match.update({
          where: { id: m.id },
          data: { status: MatchStatus.COMPLETED, winnerId: m.player1Id },
        });
        // Add a match game so standings compute correctly
        await prisma.matchGame.create({
          data: {
            matchId: m.id,
            gameNumber: 1,
            player1Points: 11,
            player2Points: 5,
          },
        });
      }
    }
  });

  it("returns { ok: true } after all RR complete", async () => {
    const result = await generateSEStage(eventId);
    expect(result.ok).toBe(true);
  });

  it("creates SE matches with groupNumber = null", async () => {
    const seMatches = await prisma.match.findMany({
      where: { eventId, groupNumber: null },
    });
    // 2 groups × 1 advancer = 2 players → 1 final match
    expect(seMatches).toHaveLength(1);
    expect(seMatches[0].groupNumber).toBeNull();
  });

  it("stamps seed on advancing EventEntry rows", async () => {
    const entries = await prisma.eventEntry.findMany({ where: { eventId } });
    const seeded = entries.filter((e) => e.seed !== null);
    // 1 advancer per group × 2 groups = 2 seeded entries
    expect(seeded).toHaveLength(2);
  });
});

describe("regenerateSEStage", () => {
  it("deletes existing SE matches and recreates them", async () => {
    const before = await prisma.match.findMany({ where: { eventId, groupNumber: null } });
    const beforeIds = before.map((m) => m.id);

    const result = await regenerateSEStage(eventId);
    expect(result.ok).toBe(true);

    const after = await prisma.match.findMany({ where: { eventId, groupNumber: null } });
    expect(after).toHaveLength(before.length);
    // New matches should have different IDs
    expect(after.every((m) => !beforeIds.includes(m.id))).toBe(true);
  });
});

describe("getEventPodium for RR_TO_SE", () => {
  it("returns null podium when SE has no completed matches", async () => {
    const podium = await getEventPodium(eventId, "RR_TO_SE");
    expect(podium.first).toBeNull();
    expect(podium.second).toBeNull();
  });

  it("returns winner and finalist after SE final is completed", async () => {
    // Complete the SE final match
    const seMatch = await prisma.match.findFirst({
      where: { eventId, groupNumber: null },
    });
    if (!seMatch || !seMatch.player1Id || !seMatch.player2Id) {
      throw new Error("SE final match not set up properly");
    }

    await prisma.match.update({
      where: { id: seMatch.id },
      data: { status: MatchStatus.COMPLETED, winnerId: seMatch.player1Id },
    });

    const podium = await getEventPodium(eventId, "RR_TO_SE");
    expect(podium.first).not.toBeNull();
    expect(podium.second).not.toBeNull();
    expect(podium.first!.id).toBe(seMatch.player1Id);
    expect(podium.second!.id).toBe(seMatch.player2Id);
  });
});
