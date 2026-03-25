import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateBracket, getEventBracket, getRoundRobinStandings } from "@/server/services/bracket.service";

const prisma = new PrismaClient();

const CLERK_IDS = [
  "test_groupdraw_p1",
  "test_groupdraw_p2",
  "test_groupdraw_p3",
  "test_groupdraw_p4",
  "test_groupdraw_p5",
  "test_groupdraw_p6",
];
const EMAILS = CLERK_IDS.map((id) => `${id}@rallybase.test`);

let tournamentId: string;
let eventId: string;
const profileIds: string[] = [];

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

// Ratings assigned to players (descending): p1=1900, p2=1800, ..., p6=1400
const RATINGS = [1900, 1800, 1700, 1600, 1500, 1400];

async function setupGroupedRREvent(groupSize: number) {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No org found — run seed first");
  const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org.id } });
  if (!category) throw new Error("No rating category found — run seed first");

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      name: "GroupDraw Test Tournament",
      startDate: new Date("2026-08-01"),
    },
  });
  tournamentId = tournament.id;

  const event = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      ratingCategoryId: category.id,
      name: "GroupDraw RR Event",
      eventFormat: "ROUND_ROBIN",
      groupSize,
    },
  });
  eventId = event.id;

  for (let i = 0; i < CLERK_IDS.length; i++) {
    const user = await prisma.user.upsert({
      where: { clerkId: CLERK_IDS[i] },
      update: {},
      create: { clerkId: CLERK_IDS[i], email: EMAILS[i], name: `GroupDraw Player ${i + 1}` },
    });
    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: `GroupDraw Player ${i + 1}` },
    });
    profileIds[i] = profile.id;

    await prisma.eventEntry.create({
      data: { eventId: event.id, playerProfileId: profile.id },
    });

    // Set player ratings for the event's rating category
    await prisma.playerRating.upsert({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: profile.id, ratingCategoryId: category.id } },
      update: { rating: RATINGS[i] },
      create: { playerProfileId: profile.id, ratingCategoryId: category.id, rating: RATINGS[i] },
    });
  }

  return { event };
}

describe("Group draw — multi-group RR schedule generation (6 players, groupSize 3)", () => {
  it("generates 2 groups of 3 matches each (3C2 = 3 per group)", async () => {
    await setupGroupedRREvent(3);
    await generateBracket(eventId);
    const matches = await getEventBracket(eventId);
    expect(matches).toHaveLength(6); // 2 groups × 3 matches each
  });

  it("all matches have nextMatchId = null (no bracket advancement for RR)", async () => {
    const matches = await getEventBracket(eventId);
    expect(matches.every((m) => m.nextMatchId === null)).toBe(true);
  });

  it("matches are split into exactly 2 distinct groupNumber values", async () => {
    const matches = await getEventBracket(eventId);
    const groupNums = [...new Set(matches.map((m) => (m as typeof m & { groupNumber?: number | null }).groupNumber))];
    const validGroups = groupNums.filter((g) => g !== null && g !== undefined);
    expect(validGroups.sort()).toEqual([1, 2]);
  });

  it("each group has exactly 3 matches", async () => {
    const matches = await getEventBracket(eventId);
    const byGroup = new Map<number, number>();
    for (const m of matches) {
      const gNum = (m as typeof m & { groupNumber?: number | null }).groupNumber;
      if (gNum != null) byGroup.set(gNum, (byGroup.get(gNum) ?? 0) + 1);
    }
    for (const count of byGroup.values()) {
      expect(count).toBe(3);
    }
  });

  it("EventEntry groupNumber is set for all players after generation", async () => {
    const entries = await prisma.eventEntry.findMany({ where: { eventId } });
    expect(entries.every((e) => e.groupNumber !== null)).toBe(true);
  });

  it("group 1 players include the highest-rated player (snake seeding)", async () => {
    // p1 (rating 1900, index 0) should be in group 1
    const entry = await prisma.eventEntry.findFirst({
      where: { eventId, playerProfileId: profileIds[0] },
    });
    expect(entry?.groupNumber).toBe(1);
  });

  it("players within each group have played only each other (no cross-group matches)", async () => {
    const entries = await prisma.eventEntry.findMany({ where: { eventId } });
    const matches = await getEventBracket(eventId);

    const groupOf = new Map(entries.map((e) => [e.playerProfileId, e.groupNumber]));
    for (const m of matches) {
      if (m.player1Id && m.player2Id) {
        expect(groupOf.get(m.player1Id)).toBe(groupOf.get(m.player2Id));
      }
    }
  });

  it("getRoundRobinStandings (grouped=true) returns 2 group standings", async () => {
    const grouped = await getRoundRobinStandings(eventId, true);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].groupNumber).toBe(1);
    expect(grouped[1].groupNumber).toBe(2);
    expect(grouped[0].standings).toHaveLength(3);
    expect(grouped[1].standings).toHaveLength(3);
  });
});
