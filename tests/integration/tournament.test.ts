import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getTournaments,
  getTournamentDetail,
  createTournament,
  getEventDetail,
  createEvent,
  addEntrant,
} from "@/server/services/tournament.service";

const prisma = new PrismaClient();

// Stable test identifiers
const TEST_CLERK_ID = "test_phase4_tournament";
const TEST_EMAIL = "phase4test@rallybase.test";

let organizationId: string;
let ratingCategoryId: string;
let tournamentId: string;
let eventId: string;
let playerProfileId: string;

afterAll(async () => {
  // Clean up in dependency order
  if (eventId) {
    await prisma.eventEntry.deleteMany({ where: { eventId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
  }
  if (tournamentId) {
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
  }
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

async function seedOrganizationAndCategory() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organizations found — run db seed first");
  const category = await prisma.ratingCategory.findFirst({
    where: { organizationId: org.id },
  });
  if (!category) throw new Error("No rating categories found — run db seed first");
  return { organizationId: org.id, ratingCategoryId: category.id };
}

async function seedPlayer() {
  const user = await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID, email: TEST_EMAIL, name: "Phase4 Tester" },
  });
  const profile = await prisma.playerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: "Phase4 Tester" },
  });
  return profile.id;
}

describe("Tournament service — createTournament", () => {
  it("creates a tournament and returns the full detail", async () => {
    const ids = await seedOrganizationAndCategory();
    organizationId = ids.organizationId;
    ratingCategoryId = ids.ratingCategoryId;
    playerProfileId = await seedPlayer();

    const result = await createTournament({
      organizationId,
      name: "Phase4 Test Open",
      location: "Test City, IL",
      startDate: "2026-06-01",
    });

    expect("tournament" in result).toBe(true);
    if (!("tournament" in result)) return;

    tournamentId = result.tournament.id;
    expect(result.tournament.name).toBe("Phase4 Test Open");
    expect(result.tournament.organization).toBeDefined();
    expect(Array.isArray(result.tournament.events)).toBe(true);
  });

  it("returns fieldErrors for missing required fields", async () => {
    const result = await createTournament({ name: "Missing Org" });
    expect("fieldErrors" in result).toBe(true);
  });
});

describe("Tournament service — getTournaments", () => {
  it("returns an array including the created tournament", async () => {
    const tournaments = await getTournaments();
    expect(Array.isArray(tournaments)).toBe(true);
    expect(tournaments.some((t) => t.id === tournamentId)).toBe(true);
  });

  it("includes organization and event count", async () => {
    const tournaments = await getTournaments();
    const t = tournaments.find((x) => x.id === tournamentId)!;
    expect(t.organization).toBeDefined();
    expect(Array.isArray(t.events)).toBe(true);
  });
});

describe("Tournament service — getTournamentDetail", () => {
  it("returns the tournament with events", async () => {
    const t = await getTournamentDetail(tournamentId);
    expect(t).not.toBeNull();
    expect(t!.name).toBe("Phase4 Test Open");
    expect(t!.location).toBe("Test City, IL");
    expect(Array.isArray(t!.events)).toBe(true);
  });

  it("returns null for a non-existent tournament", async () => {
    const t = await getTournamentDetail("nonexistent-id");
    expect(t).toBeNull();
  });
});

describe("Tournament service — createEvent", () => {
  it("creates an event within the tournament", async () => {
    const result = await createEvent(tournamentId, {
      ratingCategoryId,
      name: "U1800 Singles",
      format: "BEST_OF_5",
      gamePointTarget: 11,
    });

    expect("event" in result).toBe(true);
    if (!("event" in result)) return;

    eventId = result.event.id;
    expect(result.event.name).toBe("U1800 Singles");
    expect(result.event.format).toBe("BEST_OF_5");
    expect(result.event.gamePointTarget).toBe(11);
    expect(result.event.ratingCategory).toBeDefined();
    expect(result.event.tournament).toBeDefined();
  });

  it("returns fieldErrors for invalid format", async () => {
    const result = await createEvent(tournamentId, {
      ratingCategoryId,
      name: "Bad Event",
      format: "BEST_OF_9",
      gamePointTarget: 11,
    });
    expect("fieldErrors" in result).toBe(true);
  });
});

describe("Tournament service — getEventDetail", () => {
  it("returns the event with entries list", async () => {
    const event = await getEventDetail(eventId);
    expect(event).not.toBeNull();
    expect(event!.name).toBe("U1800 Singles");
    expect(Array.isArray(event!.eventEntries)).toBe(true);
    expect(event!.eventEntries.length).toBe(0);
  });

  it("returns null for a non-existent event", async () => {
    const event = await getEventDetail("nonexistent-id");
    expect(event).toBeNull();
  });
});

describe("Tournament service — addEntrant", () => {
  it("adds a player to the event", async () => {
    const result = await addEntrant(eventId, { playerProfileId });
    expect("entry" in result).toBe(true);
  });

  it("getEventDetail shows the new entrant", async () => {
    const event = await getEventDetail(eventId);
    expect(event!.eventEntries.length).toBe(1);
    expect(event!.eventEntries[0].playerProfile.displayName).toBe("Phase4 Tester");
  });

  it("rejects adding the same player twice", async () => {
    const result = await addEntrant(eventId, { playerProfileId });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("already entered");
    }
  });

  it("returns fieldErrors for missing playerProfileId", async () => {
    const result = await addEntrant(eventId, { playerProfileId: "" });
    expect("fieldErrors" in result).toBe(true);
  });
});

describe("Tournament service — getTournamentDetail shows event entry count", () => {
  it("_count.eventEntries reflects added entrants", async () => {
    const t = await getTournamentDetail(tournamentId);
    const event = t!.events.find((e) => e.id === eventId)!;
    expect(event._count.eventEntries).toBe(1);
  });
});
