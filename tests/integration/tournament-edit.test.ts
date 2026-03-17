import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createTournament,
  createEvent,
  updateTournament,
  updateEvent,
} from "@/server/services/tournament.service";

const prisma = new PrismaClient();

const TEST_CLERK_ID = "test_v060_edit";
const TEST_CLERK_ID_OTHER = "test_v060_edit_other";
const TEST_EMAIL = "v060edit@rallybase.test";
const TEST_EMAIL_OTHER = "v060editother@rallybase.test";

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
    create: { clerkId: TEST_CLERK_ID, email: TEST_EMAIL, name: "Edit Tester" },
  });
  await prisma.user.upsert({
    where: { clerkId: TEST_CLERK_ID_OTHER },
    update: {},
    create: { clerkId: TEST_CLERK_ID_OTHER, email: TEST_EMAIL_OTHER, name: "Other Tester" },
  });

  return { organizationId: org.id, ratingCategoryId: category.id };
}

describe("updateTournament", () => {
  it("creates a tournament and event for edit tests", async () => {
    const ids = await seedSetup();
    organizationId = ids.organizationId;
    ratingCategoryId = ids.ratingCategoryId;

    const result = await createTournament(
      {
        organizationId,
        name: "Edit Test Tournament",
        startDate: "2026-07-01",
      },
      TEST_CLERK_ID,
    );
    expect("tournament" in result).toBe(true);
    if (!("tournament" in result)) return;
    tournamentId = result.tournament.id;

    const eventResult = await createEvent(tournamentId, {
      ratingCategoryId,
      name: "Edit Test Event",
      format: "BEST_OF_3",
      gamePointTarget: 11,
    });
    expect("event" in eventResult).toBe(true);
    if (!("event" in eventResult)) return;
    eventId = eventResult.event.id;
  });

  it("updates tournament name and location", async () => {
    const result = await updateTournament(
      tournamentId,
      {
        name: "Edit Test Tournament Updated",
        location: "New City, TX",
        startDate: "2026-07-01",
      },
      TEST_CLERK_ID,
    );
    expect("tournament" in result).toBe(true);
    if (!("tournament" in result)) return;
    expect(result.tournament.name).toBe("Edit Test Tournament Updated");
    expect(result.tournament.location).toBe("New City, TX");
  });

  it("returns error for non-owner", async () => {
    const result = await updateTournament(
      tournamentId,
      {
        name: "Unauthorized Update",
        startDate: "2026-07-01",
      },
      TEST_CLERK_ID_OTHER,
    );
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Not authorized");
    }
  });

  it("returns fieldErrors for invalid data", async () => {
    const result = await updateTournament(
      tournamentId,
      { name: "x", startDate: "" },
      TEST_CLERK_ID,
    );
    expect("fieldErrors" in result).toBe(true);
  });
});

describe("updateEvent", () => {
  it("updates event name and format", async () => {
    const result = await updateEvent(
      eventId,
      {
        name: "Edit Test Event Updated",
        format: "BEST_OF_5",
        gamePointTarget: 11,
      },
      TEST_CLERK_ID,
    );
    expect("event" in result).toBe(true);
    if (!("event" in result)) return;
    expect(result.event.name).toBe("Edit Test Event Updated");
    expect(result.event.format).toBe("BEST_OF_5");
  });

  it("returns error for non-owner", async () => {
    const result = await updateEvent(
      eventId,
      {
        name: "Unauthorized",
        format: "BEST_OF_3",
        gamePointTarget: 11,
      },
      TEST_CLERK_ID_OTHER,
    );
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Not authorized");
    }
  });

  it("returns fieldErrors for invalid gamePointTarget", async () => {
    const result = await updateEvent(
      eventId,
      {
        name: "Bad Event",
        format: "BEST_OF_3",
        gamePointTarget: 7,
      },
      TEST_CLERK_ID,
    );
    expect("fieldErrors" in result).toBe(true);
  });
});
