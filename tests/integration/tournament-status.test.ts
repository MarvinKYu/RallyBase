import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createTournament,
  createEvent,
  advanceTournamentStatus,
  advanceEventStatus,
  getPublicTournaments,
  getMyTournaments,
} from "@/server/services/tournament.service";

const prisma = new PrismaClient();

const TEST_CLERK_ID = "test_v060_status";
const TEST_CLERK_ID_OTHER = "test_v060_status_other";
const TEST_EMAIL = "v060status@rallybase.test";
const TEST_EMAIL_OTHER = "v060statusother@rallybase.test";

let organizationId: string;
let ratingCategoryId: string;
let tournamentId: string;
let eventId: string;

afterAll(async () => {
  if (eventId) {
    await prisma.event.deleteMany({ where: { id: eventId } });
  }
  if (tournamentId) {
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
  }
  for (const clerkId of [TEST_CLERK_ID, TEST_CLERK_ID_OTHER]) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) {
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
  await prisma.$disconnect();
});

async function seedSetup() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organizations found — run db seed first");
  const category = await prisma.ratingCategory.findFirst({
    where: { organizationId: org.id },
  });
  if (!category) throw new Error("No rating categories found — run db seed first");

  await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID },
    update: {},
    create: { clerkId: TEST_CLERK_ID, email: TEST_EMAIL, name: "Status Tester" },
  });
  await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID_OTHER },
    update: {},
    create: { clerkId: TEST_CLERK_ID_OTHER, email: TEST_EMAIL_OTHER, name: "Other Tester" },
  });

  return { organizationId: org.id, ratingCategoryId: category.id };
}

describe("advanceTournamentStatus", () => {
  it("creates a tournament for status tests", async () => {
    const ids = await seedSetup();
    organizationId = ids.organizationId;
    ratingCategoryId = ids.ratingCategoryId;

    const result = await createTournament(
      {
        organizationId,
        name: "Status Test Tournament",
        startDate: "2026-08-01",
      },
      TEST_CLERK_ID,
    );
    expect("tournament" in result).toBe(true);
    if (!("tournament" in result)) return;
    tournamentId = result.tournament.id;

    const eventResult = await createEvent(tournamentId, {
      ratingCategoryId,
      name: "Status Test Event",
      format: "BEST_OF_3",
      gamePointTarget: 11,
    });
    expect("event" in eventResult).toBe(true);
    if (!("event" in eventResult)) return;
    eventId = eventResult.event.id;
  });

  it("advances DRAFT → PUBLISHED", async () => {
    const result = await advanceTournamentStatus(tournamentId, TEST_CLERK_ID);
    expect("status" in result).toBe(true);
    if ("status" in result) expect(result.status).toBe("PUBLISHED");
  });

  it("advances PUBLISHED → IN_PROGRESS", async () => {
    const result = await advanceTournamentStatus(tournamentId, TEST_CLERK_ID);
    expect("status" in result).toBe(true);
    if ("status" in result) expect(result.status).toBe("IN_PROGRESS");
  });

  it("advances IN_PROGRESS → COMPLETED", async () => {
    const result = await advanceTournamentStatus(tournamentId, TEST_CLERK_ID);
    expect("status" in result).toBe(true);
    if ("status" in result) expect(result.status).toBe("COMPLETED");
  });

  it("rejects advancing past COMPLETED", async () => {
    const result = await advanceTournamentStatus(tournamentId, TEST_CLERK_ID);
    expect("error" in result).toBe(true);
  });

  it("rejects non-owner", async () => {
    // Reset tournament to DRAFT via prisma to test auth rejection
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "DRAFT" },
    });
    const result = await advanceTournamentStatus(tournamentId, TEST_CLERK_ID_OTHER);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Not authorized");
    // Restore
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "COMPLETED" },
    });
  });
});

describe("advanceEventStatus", () => {
  beforeAll(async () => {
    // The advanceTournamentStatus cascade (v0.6.2) moves events from DRAFT →
    // REGISTRATION_OPEN → IN_PROGRESS as the tournament advances. Reset to DRAFT
    // so these tests can exercise the full event status progression in isolation.
    // Also reset the tournament to PUBLISHED so the event-advance guard passes
    // (guard requires tournament to be published before advancing events).
    await prisma.event.update({ where: { id: eventId }, data: { status: "DRAFT" } });
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "PUBLISHED" } });
  });

  it("advances DRAFT → REGISTRATION_OPEN", async () => {
    const result = await advanceEventStatus(eventId, TEST_CLERK_ID);
    expect("status" in result).toBe(true);
    if ("status" in result) expect(result.status).toBe("REGISTRATION_OPEN");
  });

  it("advances REGISTRATION_OPEN → IN_PROGRESS", async () => {
    const result = await advanceEventStatus(eventId, TEST_CLERK_ID);
    expect("status" in result).toBe(true);
    if ("status" in result) expect(result.status).toBe("IN_PROGRESS");
  });

  it("advances IN_PROGRESS → COMPLETED", async () => {
    const result = await advanceEventStatus(eventId, TEST_CLERK_ID);
    expect("status" in result).toBe(true);
    if ("status" in result) expect(result.status).toBe("COMPLETED");
  });

  it("rejects advancing past COMPLETED", async () => {
    const result = await advanceEventStatus(eventId, TEST_CLERK_ID);
    expect("error" in result).toBe(true);
  });

  it("rejects non-owner", async () => {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: "DRAFT" },
    });
    const result = await advanceEventStatus(eventId, TEST_CLERK_ID_OTHER);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Not authorized");
    await prisma.event.update({
      where: { id: eventId },
      data: { status: "COMPLETED" },
    });
  });
});

describe("findPublicTournaments", () => {
  it("excludes DRAFT tournaments", async () => {
    // Create a draft tournament (no status override = DRAFT by default)
    const draftResult = await createTournament(
      {
        organizationId,
        name: "Draft Visibility Test",
        startDate: "2026-09-01",
      },
      TEST_CLERK_ID,
    );
    expect("tournament" in draftResult).toBe(true);
    if (!("tournament" in draftResult)) return;
    const draftId = draftResult.tournament.id;

    const publicList = await getPublicTournaments();
    expect(publicList.some((t) => t.id === draftId)).toBe(false);

    // Clean up
    await prisma.tournament.delete({ where: { id: draftId } });
  });

  it("includes PUBLISHED tournaments", async () => {
    const publicList = await getPublicTournaments();
    const published = await prisma.tournament.findMany({
      where: { status: { not: "DRAFT" } },
    });
    expect(publicList.length).toBe(published.length);
  });
});

describe("getMyTournaments", () => {
  it("includes DRAFT tournaments for their creator", async () => {
    const draftResult = await createTournament(
      {
        organizationId,
        name: "My Draft Test",
        startDate: "2026-10-01",
      },
      TEST_CLERK_ID,
    );
    expect("tournament" in draftResult).toBe(true);
    if (!("tournament" in draftResult)) return;
    const draftId = draftResult.tournament.id;

    const myList = await getMyTournaments(TEST_CLERK_ID);
    expect(myList.some((t) => t.id === draftId)).toBe(true);

    // Other user should not see it
    const otherList = await getMyTournaments(TEST_CLERK_ID_OTHER);
    expect(otherList.some((t) => t.id === draftId)).toBe(false);

    // Clean up
    await prisma.tournament.delete({ where: { id: draftId } });
  });
});
