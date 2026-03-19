import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getPlayerTournamentHistory } from "@/server/services/tournament.service";

const prisma = new PrismaClient();

const CLERK_ID = "test_mt_p1";
const EMAIL = "mt_p1@rallybase.test";

let profileId: string;
let tournamentId: string;
let otherTournamentId: string;
let eventId1: string;
let eventId2: string;
let otherEventId: string;

beforeAll(async () => {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No org found — run seed first");
  const category = await prisma.ratingCategory.findFirst({ where: { organizationId: org.id } });
  if (!category) throw new Error("No rating category found — run seed first");

  const user = await prisma.user.upsert({
    where: { clerkId: CLERK_ID },
    update: {},
    create: { clerkId: CLERK_ID, email: EMAIL, name: "MT Player 1" },
  });
  const profile = await prisma.playerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: "MT Player 1" },
  });
  profileId = profile.id;

  // Tournament with 2 events, player entered in both
  const tournament = await prisma.tournament.create({
    data: { organizationId: org.id, name: "MT Test Tournament", startDate: new Date("2026-10-01") },
  });
  tournamentId = tournament.id;

  const event1 = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      name: "MT Event 1",
      format: "BEST_OF_3",
      eventFormat: "SINGLE_ELIMINATION",
      gamePointTarget: 11,
      ratingCategoryId: category.id,
    },
  });
  eventId1 = event1.id;

  const event2 = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      name: "MT Event 2",
      format: "BEST_OF_3",
      eventFormat: "SINGLE_ELIMINATION",
      gamePointTarget: 11,
      ratingCategoryId: category.id,
    },
  });
  eventId2 = event2.id;

  // Event 3 in same tournament — player NOT entered
  await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      name: "MT Event 3 (not entered)",
      format: "BEST_OF_3",
      eventFormat: "SINGLE_ELIMINATION",
      gamePointTarget: 11,
      ratingCategoryId: category.id,
    },
  });

  // Enter player in event1 and event2 only
  await prisma.eventEntry.createMany({
    data: [
      { eventId: eventId1, playerProfileId: profileId },
      { eventId: eventId2, playerProfileId: profileId },
    ],
  });

  // Second tournament — player NOT entered
  const otherTournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      name: "MT Other Tournament",
      startDate: new Date("2026-11-01"),
    },
  });
  otherTournamentId = otherTournament.id;

  const otherEvent = await prisma.event.create({
    data: {
      tournamentId: otherTournament.id,
      name: "MT Other Event",
      format: "BEST_OF_3",
      eventFormat: "SINGLE_ELIMINATION",
      gamePointTarget: 11,
      ratingCategoryId: category.id,
    },
  });
  otherEventId = otherEvent.id;
});

afterAll(async () => {
  await prisma.eventEntry.deleteMany({ where: { playerProfileId: profileId } });
  if (otherEventId) await prisma.event.delete({ where: { id: otherEventId } }).catch(() => {});
  if (otherTournamentId) await prisma.tournament.delete({ where: { id: otherTournamentId } }).catch(() => {});
  // event3 deleted by tournament cascade
  if (eventId2) await prisma.event.delete({ where: { id: eventId2 } }).catch(() => {});
  if (eventId1) await prisma.event.delete({ where: { id: eventId1 } }).catch(() => {});
  if (tournamentId) await prisma.tournament.delete({ where: { id: tournamentId } }).catch(() => {});
  const user = await prisma.user.findUnique({ where: { clerkId: CLERK_ID } });
  if (user) {
    await prisma.playerProfile.delete({ where: { userId: user.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

describe("getPlayerTournamentHistory", () => {
  it("returns tournaments where the player has an entry", async () => {
    const result = await getPlayerTournamentHistory(profileId);
    const ids = result.map((t) => t.id);
    expect(ids).toContain(tournamentId);
  });

  it("excludes tournaments where the player has no entry", async () => {
    const result = await getPlayerTournamentHistory(profileId);
    const ids = result.map((t) => t.id);
    expect(ids).not.toContain(otherTournamentId);
  });

  it("only includes events the player is entered in (not all events in the tournament)", async () => {
    const result = await getPlayerTournamentHistory(profileId);
    const t = result.find((r) => r.id === tournamentId);
    expect(t).toBeDefined();
    const eventIds = t!.events.map((e) => e.id);
    expect(eventIds).toContain(eventId1);
    expect(eventIds).toContain(eventId2);
    // Event 3 ("not entered") must not appear
    const eventNames = t!.events.map((e) => e.name);
    expect(eventNames).not.toContain("MT Event 3 (not entered)");
  });
});
