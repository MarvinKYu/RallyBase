import { EventFormat, EventStatus, Gender, MatchFormat, Prisma, TournamentStatus } from "@prisma/client";
import {
  createTournamentSchema,
  createEventSchema,
  updateTournamentSchema,
  updateEventSchema,
  addEntrantSchema,
} from "@/lib/schemas/tournament";
import {
  findAllOrganizations,
  findRatingCategoriesByOrganization,
  findAllTournaments,
  findPublicTournaments,
  findTournamentsByCreator,
  findEventManageDetail,
  findTournamentManageDetail,
  findTournamentById,
  findTournamentsWithEntriesByProfile,
  findTournamentsByPlayerProfile,
  createTournament as dbCreateTournament,
  updateTournamentById,
  setTournamentStatus,
  deleteTournamentById,
  deleteEventById,
  findEventById,
  createEvent as dbCreateEvent,
  updateEventById,
  setEventStatus,
  findEventEntry,
  createEventEntry,
  countEventEntries,
  deleteEventEntry,
  findEventEntriesForPlayer,
  setEventStatusByTournamentId,
  countNonCompletedEvents,
  countMatchesByEventId,
  findEventSummariesByTournament,
  countProgressedMatches,
  deleteAllMatchesForEvent,
} from "@/server/repositories/tournament.repository";
import { generateBracket } from "@/server/services/bracket.service";
import { findPlayerRatingByCategory } from "@/server/repositories/rating.repository";
import { isAuthorizedAsTD, canCreateTournamentInOrg } from "@/server/services/admin.service";

const TOURNAMENT_STATUS_ORDER: TournamentStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "IN_PROGRESS",
  "COMPLETED",
];
const EVENT_STATUS_ORDER: EventStatus[] = [
  "DRAFT",
  "REGISTRATION_OPEN",
  "IN_PROGRESS",
  "COMPLETED",
];

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getOrganizations() {
  return findAllOrganizations();
}

export async function getRatingCategoriesForOrg(organizationId: string) {
  return findRatingCategoriesByOrganization(organizationId);
}

export async function getTournaments() {
  return findAllTournaments();
}

export async function getTournamentDetail(id: string) {
  return findTournamentById(id);
}

export async function getEventDetail(id: string) {
  return findEventById(id);
}

export async function getTournamentsForPlayer(playerProfileId: string) {
  return findTournamentsByPlayerProfile(playerProfileId);
}

export async function getPlayerTournamentHistory(playerProfileId: string) {
  return findTournamentsWithEntriesByProfile(playerProfileId);
}

export async function getPublicTournaments() {
  return findPublicTournaments();
}

export async function getMyTournaments(clerkId: string) {
  return findTournamentsByCreator(clerkId);
}

export async function getEventManageDetail(eventId: string, clerkId: string) {
  const event = await findEventManageDetail(eventId);
  if (!event) return null;
  if (!(await isAuthorizedAsTD(clerkId, event.tournament))) return null;
  return event;
}

export async function getTournamentManageDetail(tournamentId: string, clerkId: string) {
  const tournament = await findTournamentManageDetail(tournamentId);
  if (!tournament) return null;
  if (!(await isAuthorizedAsTD(clerkId, tournament))) return null;
  return tournament;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type CreateTournamentResult =
  | { tournament: NonNullable<Awaited<ReturnType<typeof findTournamentById>>> }
  | { error: string }
  | { fieldErrors: Record<string, string[]> };

export async function createTournament(
  data: unknown,
  createdByClerkId?: string,
): Promise<CreateTournamentResult> {
  const parsed = createTournamentSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { organizationId, name, location, startDate, endDate, startTime, withdrawDeadline, verificationMethod } = parsed.data;

  if (createdByClerkId && !(await canCreateTournamentInOrg(createdByClerkId, organizationId))) {
    return { error: "You are not authorized to create tournaments in this organization." };
  }

  try {
    const tournament = await dbCreateTournament({
      organizationId,
      createdByClerkId,
      name,
      location: location || undefined,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      startTime: startTime ? new Date(startTime) : undefined,
      withdrawDeadline: withdrawDeadline ? new Date(withdrawDeadline) : undefined,
      verificationMethod,
    });

    const full = await findTournamentById(tournament.id);
    return { tournament: full! };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { name: ["A tournament with this name already exists in this organization."] } };
    }
    throw e;
  }
}

export async function deleteTournament(tournamentId: string, clerkId: string) {
  const tournament = await findTournamentById(tournamentId);
  if (!tournament) return { error: "Tournament not found." };
  if (!(await isAuthorizedAsTD(clerkId, tournament))) return { error: "Not authorized." };
  await deleteTournamentById(tournamentId);
  return { success: true };
}

export async function deleteEvent(eventId: string, clerkId: string) {
  const event = await findEventById(eventId);
  if (!event) return { error: "Event not found." };
  if (!(await isAuthorizedAsTD(clerkId, event.tournament))) return { error: "Not authorized." };
  await deleteEventById(eventId);
  return { success: true, tournamentId: event.tournament.id };
}

export type UpdateTournamentResult =
  | { tournament: NonNullable<Awaited<ReturnType<typeof findTournamentById>>> }
  | { error: string }
  | { fieldErrors: Record<string, string[]> };

export async function updateTournament(
  tournamentId: string,
  data: unknown,
  clerkId: string,
): Promise<UpdateTournamentResult> {
  const tournament = await findTournamentById(tournamentId);
  if (!tournament) return { error: "Tournament not found." };
  if (!(await isAuthorizedAsTD(clerkId, tournament))) return { error: "Not authorized." };

  const parsed = updateTournamentSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { name, location, startDate, endDate, startTime, withdrawDeadline, verificationMethod } = parsed.data;

  try {
    await updateTournamentById(tournamentId, {
      name,
      location: location || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      startTime: startTime ? new Date(startTime) : null,
      withdrawDeadline: withdrawDeadline ? new Date(withdrawDeadline) : null,
      verificationMethod,
    });
    const updated = await findTournamentById(tournamentId);
    return { tournament: updated! };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        fieldErrors: { name: ["A tournament with this name already exists in this organization."] },
      };
    }
    throw e;
  }
}

export type UpdateEventResult =
  | { event: NonNullable<Awaited<ReturnType<typeof findEventById>>> }
  | { error: string }
  | { fieldErrors: Record<string, string[]> };

export async function updateEvent(
  eventId: string,
  data: unknown,
  clerkId: string,
): Promise<UpdateEventResult> {
  const event = await findEventById(eventId);
  if (!event) return { error: "Event not found." };
  if (!(await isAuthorizedAsTD(clerkId, event.tournament))) return { error: "Not authorized." };

  const parsed = updateEventSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const {
    name,
    format,
    hasThirdPlaceMatch,
    groupSize,
    advancersPerGroup,
    gamePointTarget,
    rrFormat,
    rrGamePointTarget,
    startTime,
    maxParticipants,
    minRating,
    maxRating,
    minAge,
    maxAge,
    allowedGender,
  } = parsed.data;

  const isGroupBased =
    event.eventFormat === "ROUND_ROBIN" || event.eventFormat === "RR_TO_SE";
  const isSEBased =
    event.eventFormat === "SINGLE_ELIMINATION" || event.eventFormat === "RR_TO_SE";

  if (isGroupBased && groupSize && maxParticipants && maxParticipants % groupSize !== 0) {
    return {
      fieldErrors: {
        maxParticipants: [`Max participants must be a multiple of group size (${groupSize})`],
      },
    };
  }

  try {
    await updateEventById(eventId, {
      name,
      format: format as MatchFormat,
      hasThirdPlaceMatch: isSEBased ? (hasThirdPlaceMatch ?? false) : false,
      groupSize: isGroupBased ? (groupSize || null) : undefined,
      advancersPerGroup:
        event.eventFormat === "RR_TO_SE" ? (advancersPerGroup || null) : undefined,
      gamePointTarget,
      rrFormat: event.eventFormat === "RR_TO_SE" ? ((rrFormat || null) as MatchFormat | null) : null,
      rrGamePointTarget: event.eventFormat === "RR_TO_SE" ? (rrGamePointTarget || null) : null,
      startTime: startTime ? new Date(startTime) : null,
      maxParticipants: maxParticipants || null,
      minRating: minRating || null,
      maxRating: maxRating || null,
      minAge: minAge || null,
      maxAge: maxAge || null,
      allowedGender: (allowedGender || null) as Gender | null,
    });
    const updated = await findEventById(eventId);
    return { event: updated! };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        fieldErrors: { name: ["An event with this name already exists in this tournament."] },
      };
    }
    throw e;
  }
}

async function tryAutoGenerateBracket(
  eventId: string,
  eventFormat: EventFormat,
  entryCount: number,
  matchCount: number,
): Promise<void> {
  if (matchCount > 0) return;
  const minPlayers = eventFormat === "ROUND_ROBIN" || eventFormat === "RR_TO_SE" ? 3 : 2;
  if (entryCount < minPlayers) return;
  try {
    await generateBracket(eventId);
  } catch {
    // silently skip — manual button remains available
  }
}

export type AdvanceStatusResult =
  | { status: TournamentStatus | EventStatus }
  | { error: string };

export async function advanceTournamentStatus(
  tournamentId: string,
  clerkId: string,
): Promise<AdvanceStatusResult> {
  const tournament = await findTournamentById(tournamentId);
  if (!tournament) return { error: "Tournament not found." };
  if (!(await isAuthorizedAsTD(clerkId, tournament))) return { error: "Not authorized." };

  const currentIndex = TOURNAMENT_STATUS_ORDER.indexOf(tournament.status);
  if (currentIndex === -1 || currentIndex === TOURNAMENT_STATUS_ORDER.length - 1) {
    return { error: "Tournament is already completed." };
  }

  const nextStatus = TOURNAMENT_STATUS_ORDER[currentIndex + 1];

  if (nextStatus === "IN_PROGRESS" && tournament.events.length === 0) {
    return { error: "Cannot start a tournament with no events." };
  }

  await setTournamentStatus(tournamentId, nextStatus);

  if (nextStatus === "PUBLISHED") {
    await setEventStatusByTournamentId(tournamentId, "DRAFT", "REGISTRATION_OPEN");
  } else if (nextStatus === "IN_PROGRESS") {
    await setEventStatusByTournamentId(tournamentId, "REGISTRATION_OPEN", "IN_PROGRESS");
    const events = await findEventSummariesByTournament(tournamentId, "IN_PROGRESS");
    for (const ev of events) {
      await tryAutoGenerateBracket(
        ev.id,
        ev.eventFormat,
        ev._count.eventEntries,
        ev._count.matches,
      );
    }
  }

  return { status: nextStatus };
}

export async function advanceEventStatus(
  eventId: string,
  clerkId: string,
): Promise<AdvanceStatusResult> {
  const event = await findEventById(eventId);
  if (!event) return { error: "Event not found." };
  if (!(await isAuthorizedAsTD(clerkId, event.tournament))) return { error: "Not authorized." };

  const currentIndex = EVENT_STATUS_ORDER.indexOf(event.status);
  if (currentIndex === -1 || currentIndex === EVENT_STATUS_ORDER.length - 1) {
    return { error: "Event is already completed." };
  }

  const nextStatus = EVENT_STATUS_ORDER[currentIndex + 1];

  if (nextStatus === "REGISTRATION_OPEN" || nextStatus === "IN_PROGRESS") {
    if (event.tournament.status === "DRAFT") {
      return { error: "The parent tournament must be published before advancing this event." };
    }
  }

  await setEventStatus(eventId, nextStatus);

  if (nextStatus === "IN_PROGRESS") {
    const matchCount = await countMatchesByEventId(eventId);
    await tryAutoGenerateBracket(
      eventId,
      event.eventFormat,
      event.eventEntries.length,
      matchCount,
    );
  }

  if (nextStatus === "COMPLETED") {
    const remaining = await countNonCompletedEvents(event.tournamentId);
    if (remaining === 0) {
      await setTournamentStatus(event.tournamentId, "COMPLETED");
    }
  }

  return { status: nextStatus };
}

export type CreateEventResult =
  | { event: NonNullable<Awaited<ReturnType<typeof findEventById>>> }
  | { error: string }
  | { fieldErrors: Record<string, string[]> };

export async function createEvent(
  tournamentId: string,
  data: unknown,
): Promise<CreateEventResult> {
  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const {
    ratingCategoryId,
    name,
    format,
    eventFormat,
    groupSize,
    advancersPerGroup,
    gamePointTarget,
    rrFormat,
    rrGamePointTarget,
    hasThirdPlaceMatch,
    startTime,
    maxParticipants,
    minRating,
    maxRating,
    minAge,
    maxAge,
    allowedGender,
  } = parsed.data;

  const tournament = await findTournamentById(tournamentId);
  const autoOpen =
    tournament?.status === TournamentStatus.PUBLISHED ||
    tournament?.status === TournamentStatus.IN_PROGRESS;

  const isGroupBased = eventFormat === "ROUND_ROBIN" || eventFormat === "RR_TO_SE";
  // hasThirdPlaceMatch only applies to SE-based formats
  const isSEBased = eventFormat === "SINGLE_ELIMINATION" || eventFormat === "RR_TO_SE";

  try {
    const event = await dbCreateEvent({
      tournamentId,
      ratingCategoryId,
      name,
      format: format as MatchFormat,
      eventFormat: eventFormat as EventFormat,
      groupSize: isGroupBased ? (groupSize || undefined) : undefined,
      advancersPerGroup:
        eventFormat === "RR_TO_SE" ? (advancersPerGroup || undefined) : undefined,
      gamePointTarget,
      rrFormat: eventFormat === "RR_TO_SE" ? ((rrFormat || undefined) as MatchFormat | undefined) : undefined,
      rrGamePointTarget: eventFormat === "RR_TO_SE" ? (rrGamePointTarget || undefined) : undefined,
      hasThirdPlaceMatch: isSEBased ? (hasThirdPlaceMatch ?? false) : false,
      startTime: startTime ? new Date(startTime) : undefined,
      maxParticipants: maxParticipants || undefined,
      minRating: minRating || undefined,
      maxRating: maxRating || undefined,
      minAge: minAge || undefined,
      maxAge: maxAge || undefined,
      allowedGender: (allowedGender || null) as Gender | null,
      status: autoOpen ? EventStatus.REGISTRATION_OPEN : undefined,
    });

    const full = await findEventById(event.id);
    return { event: full! };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { name: ["An event with this name already exists in this tournament."] } };
    }
    throw e;
  }
}

export type AddEntrantResult =
  | { entry: { id: string } }
  | { error: string }
  | { fieldErrors: Record<string, string[]> };

export async function addEntrant(
  eventId: string,
  data: unknown,
): Promise<AddEntrantResult> {
  const parsed = addEntrantSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { playerProfileId } = parsed.data;

  const existing = await findEventEntry(eventId, playerProfileId);
  if (existing) return { error: "This player is already entered in this event." };

  const entry = await createEventEntry(eventId, playerProfileId);
  return { entry };
}

// ── Eligibility ───────────────────────────────────────────────────────────────

type EligibilityEvent = {
  maxParticipants?: number | null;
  minRating?: number | null;
  maxRating?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  allowedGender?: string | null;
  tournament: { startDate: Date };
};

type EligibilityPlayer = {
  birthDate?: Date | null;
  gender?: string | null;
};

type EligibilityRating = {
  rating: number;
} | null;

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: string };

/**
 * Pure function — no DB access. Checks if a player meets event eligibility requirements.
 */
export function checkEligibility(
  player: EligibilityPlayer,
  playerRating: EligibilityRating,
  event: EligibilityEvent,
  currentEntrantCount: number,
): EligibilityResult {
  if (
    event.maxParticipants !== null &&
    event.maxParticipants !== undefined &&
    currentEntrantCount >= event.maxParticipants
  ) {
    return { eligible: false, reason: "This event is full." };
  }

  const rating = playerRating?.rating ?? 1500;

  if (event.minRating !== null && event.minRating !== undefined && rating < event.minRating) {
    return {
      eligible: false,
      reason: `Your rating (${Math.round(rating)}) is below the minimum (${Math.round(event.minRating)}).`,
    };
  }

  if (event.maxRating !== null && event.maxRating !== undefined && rating > event.maxRating) {
    return {
      eligible: false,
      reason: `Your rating (${Math.round(rating)}) exceeds the maximum (${Math.round(event.maxRating)}).`,
    };
  }

  if (
    (event.minAge !== null && event.minAge !== undefined) ||
    (event.maxAge !== null && event.maxAge !== undefined)
  ) {
    if (!player.birthDate) {
      return {
        eligible: false,
        reason: "This event has an age requirement. Please add your date of birth to your profile.",
      };
    }

    const refDate = new Date(event.tournament.startDate);
    const birth = new Date(player.birthDate);
    let age = refDate.getFullYear() - birth.getFullYear();
    const monthDiff = refDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birth.getDate())) {
      age--;
    }

    if (event.minAge !== null && event.minAge !== undefined && age < event.minAge) {
      return {
        eligible: false,
        reason: `You must be at least ${event.minAge} years old for this event.`,
      };
    }

    if (event.maxAge !== null && event.maxAge !== undefined && age > event.maxAge) {
      return {
        eligible: false,
        reason: `You must be ${event.maxAge} years old or younger for this event.`,
      };
    }
  }

  if (event.allowedGender !== null && event.allowedGender !== undefined) {
    if (!player.gender) {
      return {
        eligible: false,
        reason: "This event has a gender restriction. Please add your gender to your profile.",
      };
    }
    if (player.gender !== event.allowedGender) {
      const label = event.allowedGender === "MALE" ? "male" : "female";
      return { eligible: false, reason: `This event is ${label} only.` };
    }
  }

  return { eligible: true };
}

/**
 * Player self-signs up for an event after passing eligibility checks.
 */
export type SelfSignUpResult =
  | { entry: { id: string } }
  | { error: string };

export async function selfSignUpForEvent(
  eventId: string,
  playerProfileId: string,
  playerRating: EligibilityRating,
  player: EligibilityPlayer,
): Promise<SelfSignUpResult> {
  const event = await findEventById(eventId);
  if (!event) return { error: "Event not found." };

  if (event.status !== "REGISTRATION_OPEN") {
    return { error: "This event is not open for registration." };
  }

  const existing = await findEventEntry(eventId, playerProfileId);
  if (existing) return { error: "You are already entered in this event." };

  const entrantCount = await countEventEntries(eventId);

  const eligibility = checkEligibility(player, playerRating, event, entrantCount);
  if (!eligibility.eligible) {
    return { error: eligibility.reason };
  }

  const entry = await createEventEntry(eventId, playerProfileId);
  return { entry };
}

// ── Registration helpers ───────────────────────────────────────────────────────

/**
 * Pure function — no DB access. Determines if withdrawal is still allowed.
 */
export function isWithdrawalAllowed(
  tournament: { withdrawDeadline: Date | null; startTime: Date | null },
  now: Date,
): boolean {
  if (tournament.withdrawDeadline) {
    return now < tournament.withdrawDeadline;
  }
  if (tournament.startTime) {
    const deadline = new Date(tournament.startTime.getTime() - 24 * 60 * 60 * 1000);
    return now < deadline;
  }
  return true;
}

/**
 * Pure display helper — returns entity startTime or fallback.
 */
export function getEffectiveStartTime(
  entity: { startTime: Date | null },
  fallback?: Date | null,
): Date | null {
  return entity.startTime ?? fallback ?? null;
}

export type WithdrawResult = { success: true } | { error: string };

export async function withdrawFromEvent(
  eventId: string,
  playerProfileId: string,
): Promise<WithdrawResult> {
  const event = await findEventById(eventId);
  if (!event) return { error: "Event not found." };

  if (event.status === "IN_PROGRESS" || event.status === "COMPLETED") {
    return { error: "Cannot withdraw from an event that is in progress or completed." };
  }

  if (!isWithdrawalAllowed(event.tournament, new Date())) {
    return { error: "The withdrawal deadline has passed." };
  }

  const existing = await findEventEntry(eventId, playerProfileId);
  if (!existing) return { error: "You are not registered for this event." };

  await deleteEventEntry(eventId, playerProfileId);
  return { success: true };
}

export type RegisterForEventsResult = {
  results: Record<string, { success: true } | { error: string }>;
};

export async function registerForEvents(
  eventIds: string[],
  playerProfileId: string,
  player: EligibilityPlayer,
): Promise<RegisterForEventsResult> {
  const results: Record<string, { success: true } | { error: string }> = {};

  for (const eventId of eventIds) {
    const event = await findEventById(eventId);
    if (!event) {
      results[eventId] = { error: "Event not found." };
      continue;
    }

    const playerRating = await findPlayerRatingByCategory(playerProfileId, event.ratingCategoryId);
    const outcome = await selfSignUpForEvent(eventId, playerProfileId, playerRating, player);
    results[eventId] = "error" in outcome ? { error: outcome.error } : { success: true };
  }

  return { results };
}

export async function getRegisteredEventIds(
  playerProfileId: string,
  eventIds: string[],
): Promise<string[]> {
  return findEventEntriesForPlayer(playerProfileId, eventIds);
}

export type TdRemoveEntrantResult = { success: true } | { error: string };

export async function tdRemoveEntrant(
  eventId: string,
  playerProfileId: string,
  clerkId: string,
): Promise<TdRemoveEntrantResult> {
  const event = await findEventById(eventId);
  if (!event) return { error: "Event not found." };
  if (!(await isAuthorizedAsTD(clerkId, event.tournament))) return { error: "Not authorized." };

  const progressed = await countProgressedMatches(eventId);
  if (progressed > 0) {
    return {
      error:
        "Cannot remove a player after matches have been played in this event. To handle a player withdrawal, use 'Record result as default' for their remaining matches.",
    };
  }

  const existing = await findEventEntry(eventId, playerProfileId);
  if (!existing) return { error: "Player is not entered in this event." };

  const matchCount = await countMatchesByEventId(eventId);
  if (matchCount > 0) {
    // A schedule/bracket has been generated. Validate that removing this player
    // still leaves enough participants to regenerate.
    const currentCount = await countEventEntries(eventId);
    const remaining = currentCount - 1;
    const { eventFormat, groupSize, maxParticipants } = event;

    const minRequired = eventFormat === "SINGLE_ELIMINATION" ? 2 : 3;
    if (remaining < minRequired) {
      return {
        error:
          "Removing this player would leave fewer than the minimum required players. Add a replacement first.",
      };
    }

    if (groupSize) {
      const numGroups =
        maxParticipants != null
          ? maxParticipants / groupSize
          : Math.ceil(remaining / groupSize);
      if (Math.floor(remaining / numGroups) < 3) {
        return {
          error:
            "Removing this player would leave fewer than the minimum required players. Add a replacement first.",
        };
      }
    }

    // Remove the player, wipe the stale schedule, and regenerate with the updated pool.
    await deleteEventEntry(eventId, playerProfileId);
    await deleteAllMatchesForEvent(eventId);
    await generateBracket(eventId);
  } else {
    await deleteEventEntry(eventId, playerProfileId);
  }

  return { success: true };
}

/**
 * If a schedule exists for the event but no matches have been played,
 * wipes the stale schedule and regenerates it with the current entrant pool.
 * No-op if no schedule exists or if any match has already been played.
 */
export async function regenEventScheduleIfStale(eventId: string): Promise<void> {
  const [matchCount, progressed] = await Promise.all([
    countMatchesByEventId(eventId),
    countProgressedMatches(eventId),
  ]);
  if (matchCount > 0 && progressed === 0) {
    await deleteAllMatchesForEvent(eventId);
    await generateBracket(eventId);
  }
}
