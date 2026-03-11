import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateBracket, getEventBracket, bracketExists } from "@/server/services/bracket.service";

const prisma = new PrismaClient();

const CLERK_IDS = ["test_phase5_p1", "test_phase5_p2", "test_phase5_p3", "test_phase5_p4"];
const EMAILS = CLERK_IDS.map((id, i) => `phase5_p${i + 1}@rallybase.test`);

let eventId: string;
let tournamentId: string;
let profileIds: string[] = [];

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

async function setupEventWithPlayers(playerCount: number) {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No org found — run seed first");
  const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org.id } });
  if (!category) throw new Error("No rating category found — run seed first");

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      name: "Phase5 Bracket Test Tournament",
      startDate: new Date("2026-07-01"),
    },
  });
  tournamentId = tournament.id;

  const event = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      ratingCategoryId: category.id,
      name: "Phase5 Singles",
    },
  });
  eventId = event.id;

  // Create players and entries
  for (let i = 0; i < playerCount; i++) {
    const user = await prisma.user.upsert({
      where: { clerkId: CLERK_IDS[i] },
      update: {},
      create: { clerkId: CLERK_IDS[i], email: EMAILS[i], name: `Phase5 Player ${i + 1}` },
    });
    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: `Phase5 Player ${i + 1}` },
    });
    profileIds[i] = profile.id;

    await prisma.eventEntry.create({
      data: { eventId: event.id, playerProfileId: profile.id, seed: i + 1 },
    });
  }

  return { tournament, event };
}

describe("Bracket service — bracketExists", () => {
  it("returns false before bracket is generated", async () => {
    await setupEventWithPlayers(4);
    const exists = await bracketExists(eventId);
    expect(exists).toBe(false);
  });
});

describe("Bracket service — generateBracket (4 players)", () => {
  it("creates n−1 matches for 4 players", async () => {
    await generateBracket(eventId);
    const matches = await getEventBracket(eventId);
    expect(matches.length).toBe(3); // 4 − 1 = 3
  });

  it("bracketExists returns true after generation", async () => {
    expect(await bracketExists(eventId)).toBe(true);
  });

  it("throws if bracket is generated a second time", async () => {
    await expect(generateBracket(eventId)).rejects.toThrow();
  });

  it("R1 matches have correct seed pairings (seed1 vs seed4, seed2 vs seed3)", async () => {
    const matches = await getEventBracket(eventId);
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    expect(r1).toHaveLength(2);
    expect(r1[0].player1Id).toBe(profileIds[0]); // seed 1
    expect(r1[0].player2Id).toBe(profileIds[3]); // seed 4
    expect(r1[1].player1Id).toBe(profileIds[1]); // seed 2
    expect(r1[1].player2Id).toBe(profileIds[2]); // seed 3
  });

  it("final match (R2) starts with no players (TBD)", async () => {
    const matches = await getEventBracket(eventId);
    const final = matches.find((m) => m.round === 2)!;
    expect(final.player1Id).toBeNull();
    expect(final.player2Id).toBeNull();
    expect(final.status).toBe("PENDING");
  });

  it("R1 matches have nextMatchId pointing to the final", async () => {
    const matches = await getEventBracket(eventId);
    const r1 = matches.filter((m) => m.round === 1);
    const final = matches.find((m) => m.round === 2)!;
    expect(r1.every((m) => m.nextMatchId === final.id)).toBe(true);
  });

  it("final match has nextMatchId = null", async () => {
    const matches = await getEventBracket(eventId);
    const final = matches.find((m) => m.round === 2)!;
    expect(final.nextMatchId).toBeNull();
  });

  it("match cards include player profile data", async () => {
    const matches = await getEventBracket(eventId);
    const r1First = matches.find((m) => m.round === 1 && m.position === 1)!;
    expect(r1First.player1?.displayName).toBe("Phase5 Player 1");
    expect(r1First.player2?.displayName).toBe("Phase5 Player 4");
  });
});

describe("Bracket service — generateBracket with bye (3 players)", () => {
  let byeEventId: string;

  afterAll(async () => {
    if (byeEventId) {
      await prisma.match.deleteMany({ where: { eventId: byeEventId } });
      await prisma.eventEntry.deleteMany({ where: { eventId: byeEventId } });
      await prisma.event.delete({ where: { id: byeEventId } }).catch(() => {});
    }
  });

  it("seeds top player into next round automatically on bye", async () => {
    // Create a separate 3-player event
    const org = await prisma.organization.findFirst();
    const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org!.id } });

    const event = await prisma.event.create({
      data: {
        tournamentId,
        ratingCategoryId: category!.id,
        name: "Phase5 3-Player Singles",
      },
    });
    byeEventId = event.id;

    // Add 3 entrants (use profiles already created)
    for (let i = 0; i < 3; i++) {
      await prisma.eventEntry.create({
        data: { eventId: event.id, playerProfileId: profileIds[i], seed: i + 1 },
      });
    }

    await generateBracket(event.id);
    const matches = await getEventBracket(event.id);

    // Seed 1 gets a bye in R1 pos 1 → should auto-advance to R2
    const byeMatch = matches.find((m) => m.round === 1 && m.position === 1)!;
    expect(byeMatch.player2Id).toBeNull();
    expect(byeMatch.status).toBe("COMPLETED");
    expect(byeMatch.winnerId).toBe(profileIds[0]);

    // The semi-final match (R2 pos 1) should have seed 1 pre-filled
    const semi = matches.find((m) => m.round === 2 && m.position === 1)!;
    expect(semi.player1Id).toBe(profileIds[0]); // seed 1 advanced via bye
  });
});
