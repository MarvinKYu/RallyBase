import { MatchFormat } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── Organizations / Rating Categories ─────────────────────────────────────────

export async function findAllOrganizations() {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function findRatingCategoriesByOrganization(organizationId: string) {
  return prisma.ratingCategory.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ── Tournaments ────────────────────────────────────────────────────────────────

export async function findAllTournaments() {
  return prisma.tournament.findMany({
    include: {
      organization: true,
      events: { select: { id: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function findTournamentById(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      organization: true,
      events: {
        include: {
          ratingCategory: { include: { organization: true } },
          _count: { select: { eventEntries: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createTournament(data: {
  organizationId: string;
  name: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
}) {
  return prisma.tournament.create({ data });
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function findEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      tournament: { include: { organization: true } },
      ratingCategory: { include: { organization: true, discipline: true } },
      eventEntries: {
        include: {
          playerProfile: {
            include: {
              playerRatings: { include: { ratingCategory: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createEvent(data: {
  tournamentId: string;
  ratingCategoryId: string;
  name: string;
  format: MatchFormat;
  gamePointTarget: number;
}) {
  return prisma.event.create({ data });
}

// ── Entries ───────────────────────────────────────────────────────────────────

export async function findEventEntry(eventId: string, playerProfileId: string) {
  return prisma.eventEntry.findUnique({
    where: { eventId_playerProfileId: { eventId, playerProfileId } },
  });
}

export async function createEventEntry(
  eventId: string,
  playerProfileId: string,
  seed?: number,
) {
  return prisma.eventEntry.create({
    data: { eventId, playerProfileId, seed },
  });
}
