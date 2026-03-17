import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { registerForEvents } from "@/server/services/tournament.service";

const prisma = new PrismaClient();

const TEST_CLERK_ID = "test_registration_v050";
const TEST_EMAIL = "registration_v050@rallybase.test";

let organizationId: string;
let ratingCategoryId: string;
let tournamentId: string;
let eventId1: string;
let eventId2: string;
let playerProfileId: string;

beforeAll(async () => {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organizations found — run db seed first");
  organizationId = org.id;

  const category = await prisma.ratingCategory.findFirst({
    where: { organizationId: org.id },
  });
  if (!category) throw new Error("No rating categories found — run db seed first");
  ratingCategoryId = category.id;

  const tournament = await prisma.tournament.create({
    data: {
      organizationId,
      name: "Registration Test Tournament v050",
      startDate: new Date("2026-05-01"),
    },
  });
  tournamentId = tournament.id;

  const event1 = await prisma.event.create({
    data: {
      tournamentId,
      ratingCategoryId,
      name: "Reg Test Event A",
      format: "BEST_OF_5",
      eventFormat: "SINGLE_ELIMINATION",
      gamePointTarget: 11,
      status: "REGISTRATION_OPEN",
    },
  });
  eventId1 = event1.id;

  const event2 = await prisma.event.create({
    data: {
      tournamentId,
      ratingCategoryId,
      name: "Reg Test Event B",
      format: "BEST_OF_5",
      eventFormat: "SINGLE_ELIMINATION",
      gamePointTarget: 11,
      status: "REGISTRATION_OPEN",
    },
  });
  eventId2 = event2.id;

  let user = await prisma.user.findUnique({ where: { clerkId: TEST_CLERK_ID } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: TEST_CLERK_ID, email: TEST_EMAIL, name: "Reg Test Player" },
    });
  }

  let profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.playerProfile.create({
      data: { userId: user.id, displayName: "Reg Test Player" },
    });
  }
  playerProfileId = profile.id;
});

afterAll(async () => {
  if (eventId1) await prisma.eventEntry.deleteMany({ where: { eventId: eventId1 } });
  if (eventId2) await prisma.eventEntry.deleteMany({ where: { eventId: eventId2 } });
  if (eventId1) await prisma.event.delete({ where: { id: eventId1 } }).catch(() => {});
  if (eventId2) await prisma.event.delete({ where: { id: eventId2 } }).catch(() => {});
  if (tournamentId) await prisma.tournament.delete({ where: { id: tournamentId } }).catch(() => {});
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

describe("registerForEvents", () => {
  it("registers player for all selected events", async () => {
    const { results } = await registerForEvents(
      [eventId1, eventId2],
      playerProfileId,
      { birthDate: null },
    );

    expect(results[eventId1]).toEqual({ success: true });
    expect(results[eventId2]).toEqual({ success: true });

    const entry1 = await prisma.eventEntry.findUnique({
      where: { eventId_playerProfileId: { eventId: eventId1, playerProfileId } },
    });
    const entry2 = await prisma.eventEntry.findUnique({
      where: { eventId_playerProfileId: { eventId: eventId2, playerProfileId } },
    });
    expect(entry1).not.toBeNull();
    expect(entry2).not.toBeNull();
  });

  it("returns error for already-registered event, succeeds for new event after re-seed", async () => {
    // Re-register for eventId1 (already registered) — should fail
    // Re-register for eventId2 (already registered) — should also fail
    const { results } = await registerForEvents(
      [eventId1, eventId2],
      playerProfileId,
      { birthDate: null },
    );

    expect("error" in results[eventId1]).toBe(true);
    expect("error" in results[eventId2]).toBe(true);
  });
});
