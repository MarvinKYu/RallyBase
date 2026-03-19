import { EventFormat, EventStatus, MatchFormat, TournamentStatus } from "@prisma/client";
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

export async function findPublicTournaments() {
  return prisma.tournament.findMany({
    where: { status: { not: "DRAFT" } },
    include: {
      organization: true,
      events: { select: { id: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function findTournamentsByCreator(creatorClerkId: string) {
  return prisma.tournament.findMany({
    where: { createdByClerkId: creatorClerkId },
    include: {
      organization: true,
      events: { select: { id: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function findEventManageDetail(id: string) {
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
      matches: {
        include: {
          player1: { select: { id: true, displayName: true } },
          player2: { select: { id: true, displayName: true } },
          winner: { select: { id: true, displayName: true } },
          matchGames: { orderBy: { gameNumber: "asc" } },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });
}

export async function findTournamentManageDetail(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      organization: true,
      events: {
        include: {
          ratingCategory: true,
          _count: { select: { eventEntries: true } },
          matches: {
            include: {
              player1: { select: { displayName: true } },
              player2: { select: { displayName: true } },
              matchGames: { orderBy: { gameNumber: "asc" } },
            },
            orderBy: [{ round: "asc" }, { position: "asc" }],
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
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

export async function findTournamentsWithEntriesByProfile(playerProfileId: string) {
  return prisma.tournament.findMany({
    where: {
      events: { some: { eventEntries: { some: { playerProfileId } } } },
    },
    include: {
      organization: { select: { id: true, name: true } },
      events: {
        where: { eventEntries: { some: { playerProfileId } } },
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { startDate: "desc" },
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
  startTime?: Date;
  withdrawDeadline?: Date;
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

export async function updateTournamentById(
  id: string,
  data: {
    name: string;
    location?: string | null;
    startDate: Date;
    endDate?: Date | null;
    startTime?: Date | null;
    withdrawDeadline?: Date | null;
  },
) {
  return prisma.tournament.update({ where: { id }, data });
}

export async function setTournamentStatus(id: string, status: TournamentStatus) {
  return prisma.tournament.update({ where: { id }, data: { status } });
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
  startTime?: Date;
  maxParticipants?: number;
  minRating?: number;
  maxRating?: number;
  minAge?: number;
  maxAge?: number;
}) {
  return prisma.event.create({ data });
}

export async function updateEventById(
  id: string,
  data: {
    name: string;
    format: MatchFormat;
    gamePointTarget: number;
    startTime?: Date | null;
    maxParticipants?: number | null;
    minRating?: number | null;
    maxRating?: number | null;
    minAge?: number | null;
    maxAge?: number | null;
  },
) {
  return prisma.event.update({ where: { id }, data });
}

export async function setEventStatus(id: string, status: EventStatus) {
  return prisma.event.update({ where: { id }, data: { status } });
}

export async function setEventStatusByTournamentId(
  tournamentId: string,
  fromStatus: EventStatus,
  toStatus: EventStatus,
) {
  return prisma.event.updateMany({
    where: { tournamentId, status: fromStatus },
    data: { status: toStatus },
  });
}

export async function countNonCompletedEvents(tournamentId: string) {
  return prisma.event.count({
    where: { tournamentId, status: { not: "COMPLETED" } },
  });
}

export async function countMatchesByEventId(eventId: string) {
  return prisma.match.count({ where: { eventId } });
}

export async function countNonCompletedMatches(eventId: string) {
  return prisma.match.count({ where: { eventId, status: { not: "COMPLETED" } } });
}

export async function countProgressedMatches(eventId: string) {
  return prisma.match.count({
    where: { eventId, status: { not: "PENDING" } },
  });
}

export async function findEventSummariesByTournament(
  tournamentId: string,
  status: EventStatus,
) {
  return prisma.event.findMany({
    where: { tournamentId, status },
    select: {
      id: true,
      eventFormat: true,
      _count: { select: { eventEntries: true, matches: true } },
    },
  });
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

export async function deleteEventEntry(eventId: string, playerProfileId: string) {
  return prisma.eventEntry.delete({
    where: { eventId_playerProfileId: { eventId, playerProfileId } },
  });
}

export async function findEventEntriesForPlayer(
  playerProfileId: string,
  eventIds: string[],
): Promise<string[]> {
  const entries = await prisma.eventEntry.findMany({
    where: { playerProfileId, eventId: { in: eventIds } },
    select: { eventId: true },
  });
  return entries.map((e) => e.eventId);
}
