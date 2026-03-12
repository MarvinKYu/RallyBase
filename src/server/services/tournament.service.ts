import { MatchFormat } from "@prisma/client";
import { createTournamentSchema, createEventSchema, addEntrantSchema } from "@/lib/schemas/tournament";
import {
  findAllOrganizations,
  findRatingCategoriesByOrganization,
  findAllTournaments,
  findTournamentById,
  createTournament as dbCreateTournament,
  deleteTournamentById,
  findEventById,
  createEvent as dbCreateEvent,
  findEventEntry,
  createEventEntry,
} from "@/server/repositories/tournament.repository";

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

  const { organizationId, name, location, startDate, endDate } = parsed.data;

  const tournament = await dbCreateTournament({
    organizationId,
    createdByClerkId,
    name,
    location: location || undefined,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : undefined,
  });

  const full = await findTournamentById(tournament.id);
  return { tournament: full! };
}

export async function deleteTournament(tournamentId: string, clerkId: string) {
  const tournament = await findTournamentById(tournamentId);
  if (!tournament) return { error: "Tournament not found." };
  if (tournament.createdByClerkId !== clerkId) return { error: "Not authorized." };
  await deleteTournamentById(tournamentId);
  return { success: true };
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

  const { ratingCategoryId, name, format, gamePointTarget } = parsed.data;

  const event = await dbCreateEvent({
    tournamentId,
    ratingCategoryId,
    name,
    format: format as MatchFormat,
    gamePointTarget,
  });

  const full = await findEventById(event.id);
  return { event: full! };
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
