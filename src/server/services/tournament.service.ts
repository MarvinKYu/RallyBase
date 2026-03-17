import { EventFormat, MatchFormat, Prisma } from "@prisma/client";
import { createTournamentSchema, createEventSchema, addEntrantSchema } from "@/lib/schemas/tournament";
import {
  findAllOrganizations,
  findRatingCategoriesByOrganization,
  findAllTournaments,
  findTournamentById,
  findTournamentsByPlayerProfile,
  createTournament as dbCreateTournament,
  deleteTournamentById,
  deleteEventById,
  findEventById,
  createEvent as dbCreateEvent,
  findEventEntry,
  createEventEntry,
  countEventEntries,
  deleteEventEntry,
  findEventEntriesForPlayer,
} from "@/server/repositories/tournament.repository";
import { findPlayerRatingByCategory } from "@/server/repositories/rating.repository";

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

  const { organizationId, name, location, startDate, endDate, startTime, withdrawDeadline } = parsed.data;

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
  if (tournament.createdByClerkId !== clerkId) return { error: "Not authorized." };
  await deleteTournamentById(tournamentId);
  return { success: true };
}

export async function deleteEvent(eventId: string, clerkId: string) {
  const event = await findEventById(eventId);
  if (!event) return { error: "Event not found." };
  if (event.tournament.createdByClerkId !== clerkId) return { error: "Not authorized." };
  await deleteEventById(eventId);
  return { success: true, tournamentId: event.tournament.id };
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
    gamePointTarget,
    startTime,
    maxParticipants,
    minRating,
    maxRating,
    minAge,
    maxAge,
  } = parsed.data;

  try {
    const event = await dbCreateEvent({
      tournamentId,
      ratingCategoryId,
      name,
      format: format as MatchFormat,
      eventFormat: eventFormat as EventFormat,
      gamePointTarget,
      startTime: startTime ? new Date(startTime) : undefined,
      maxParticipants: maxParticipants || undefined,
      minRating: minRating || undefined,
      maxRating: maxRating || undefined,
      minAge: minAge || undefined,
      maxAge: maxAge || undefined,
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
  tournament: { startDate: Date };
};

type EligibilityPlayer = {
  birthDate?: Date | null;
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
