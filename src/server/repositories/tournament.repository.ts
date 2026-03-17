import { EventFormat, MatchFormat } from "@prisma/client";
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

export async function findTournamentsByPlayerProfile(playerProfileId: string) {
  return prisma.tournament.findMany({
    where: {
      events: {
        some: {
          eventEntries: { some: { playerProfileId } },
        },
      },
    },
    include: {
      organization: true,
      events: { select: { id: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function createTournament(data: {
  organizationId: string;
  createdByClerkId?: string;
  name: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
}) {
  return prisma.tournament.create({ data });
}

export async function deleteTournamentById(id: string) {
  const matchIds = await prisma.match.findMany({
    where: { event: { tournamentId: id } },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  await prisma.$transaction(async (tx) => {
    if (matchIds.length > 0) {
      await tx.match.updateMany({
        where: { id: { in: matchIds } },
        data: { nextMatchId: null },
      });
      await tx.ratingTransaction.updateMany({
        where: { matchId: { in: matchIds } },
        data: { matchId: null },
      });
    }
    await tx.tournament.delete({ where: { id } });
  });
}

export async function deleteEventById(eventId: string) {
  const matchRows = await prisma.match.findMany({
    where: { eventId },
    select: { id: true, status: true },
  });

  const allMatchIds = matchRows.map((m) => m.id);
  const completedMatchIds = matchRows
    .filter((m) => m.status === "COMPLETED")
    .map((m) => m.id);

  await prisma.$transaction(async (tx) => {
    // Reverse rating changes for completed matches
    if (completedMatchIds.length > 0) {
      const transactions = await tx.ratingTransaction.findMany({
        where: { matchId: { in: completedMatchIds } },
      });
      for (const txn of transactions) {
        await tx.playerRating.update({
          where: {
            playerProfileId_ratingCategoryId: {
              playerProfileId: txn.playerProfileId,
              ratingCategoryId: txn.ratingCategoryId,
            },
          },
          data: { rating: txn.ratingBefore, gamesPlayed: { decrement: 1 } },
        });
      }
    }

    if (allMatchIds.length > 0) {
      // Detach rating transactions from matches before cascade
      await tx.ratingTransaction.updateMany({
        where: { matchId: { in: allMatchIds } },
        data: { matchId: null },
      });
      // Break nextMatchId FK cycle (onDelete: NoAction)
      await tx.match.updateMany({
        where: { id: { in: allMatchIds } },
        data: { nextMatchId: null },
      });
    }

    await tx.event.delete({ where: { id: eventId } });
  });
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
  eventFormat: EventFormat;
  gamePointTarget: number;
  maxParticipants?: number;
  minRating?: number;
  maxRating?: number;
  minAge?: number;
  maxAge?: number;
}) {
  return prisma.event.create({ data });
}

// ── Entries ───────────────────────────────────────────────────────────────────

export async function findEventEntry(eventId: string, playerProfileId: string) {
  return prisma.eventEntry.findUnique({
    where: { eventId_playerProfileId: { eventId, playerProfileId } },
  });
}

export async function countEventEntries(eventId: string) {
  return prisma.eventEntry.count({ where: { eventId } });
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
