"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  createTournament,
  updateTournament,
  updateEvent,
  advanceTournamentStatus,
  advanceEventStatus,
  deleteTournament,
  deleteEvent,
  createEvent,
  addEntrant,
  selfSignUpForEvent,
  withdrawFromEvent,
  registerForEvents,
  getEventDetail,
  getTournamentDetail,
  tdRemoveEntrant,
} from "@/server/services/tournament.service";
import { getMyProfile } from "@/server/services/player.service";
import { findPlayerRatingByCategory } from "@/server/repositories/rating.repository";
import { isAuthorizedAsTD } from "@/server/services/admin.service";

export type TournamentActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  fields?: Record<string, string>;
} | null;

export async function createTournamentAction(
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in to create a tournament." };

  const data = {
    organizationId: formData.get("organizationId") as string,
    name: formData.get("name") as string,
    location: (formData.get("location") as string) || undefined,
    startDate: formData.get("startDate") as string,
    endDate: (formData.get("endDate") as string) || undefined,
    startTime: (formData.get("startTime") as string) || undefined,
    withdrawDeadline: (formData.get("withdrawDeadline") as string) || undefined,
    verificationMethod: (formData.get("verificationMethod") as string) || "CODE",
  };

  const result = await createTournament(data, userId);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${result.tournament.id}/manage`);
}

// tournamentId is pre-bound via .bind(null, tournamentId)
export async function updateTournamentAction(
  tournamentId: string,
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in to edit a tournament." };

  const data = {
    name: formData.get("name") as string,
    location: (formData.get("location") as string) || undefined,
    startDate: formData.get("startDate") as string,
    endDate: (formData.get("endDate") as string) || undefined,
    startTime: (formData.get("startTime") as string) || undefined,
    withdrawDeadline: (formData.get("withdrawDeadline") as string) || undefined,
    verificationMethod: (formData.get("verificationMethod") as string) || "CODE",
  };

  const result = await updateTournament(tournamentId, data, userId);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${tournamentId}`);
}

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function updateEventAction(
  eventId: string,
  tournamentId: string,
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in to edit an event." };

  const data = {
    name: formData.get("name") as string,
    format: formData.get("format") as string,
    groupSize: (formData.get("groupSize") as string) || undefined,
    advancersPerGroup: (formData.get("advancersPerGroup") as string) || undefined,
    gamePointTarget: formData.get("gamePointTarget") as string,
    startTime: (formData.get("startTime") as string) || undefined,
    maxParticipants: (formData.get("maxParticipants") as string) || undefined,
    minRating: (formData.get("minRating") as string) || undefined,
    maxRating: (formData.get("maxRating") as string) || undefined,
    minAge: (formData.get("minAge") as string) || undefined,
    maxAge: (formData.get("maxAge") as string) || undefined,
    allowedGender: (formData.get("allowedGender") as string) || undefined,
  };

  const result = await updateEvent(eventId, data, userId);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${tournamentId}/manage`);
}

// tournamentId is pre-bound via .bind(null, tournamentId)
export async function advanceTournamentStatusAction(
  tournamentId: string,
  _prevState: TournamentActionState,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in." };

  const result = await advanceTournamentStatus(tournamentId, userId);
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${tournamentId}/manage`);
}

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function advanceEventStatusAction(
  eventId: string,
  tournamentId: string,
  _prevState: TournamentActionState,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in." };

  const result = await advanceEventStatus(eventId, userId);
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${tournamentId}/events/${eventId}/manage`);
}

// tournamentId is pre-bound via .bind(null, tournamentId) in the client component
export async function createEventAction(
  tournamentId: string,
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const fields = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in to create an event.", fields };

  const tournament = await getTournamentDetail(tournamentId);
  if (!tournament) return { error: "Tournament not found.", fields };
  if (!(await isAuthorizedAsTD(userId, tournament))) return { error: "Not authorized to add events.", fields };

  const data = {
    ratingCategoryId: formData.get("ratingCategoryId") as string,
    name: formData.get("name") as string,
    format: formData.get("format") as string,
    eventFormat: (formData.get("eventFormat") as string) || "SINGLE_ELIMINATION",
    groupSize: (formData.get("groupSize") as string) || undefined,
    advancersPerGroup: (formData.get("advancersPerGroup") as string) || undefined,
    gamePointTarget: formData.get("gamePointTarget") as string,
    startTime: (formData.get("startTime") as string) || undefined,
    maxParticipants: (formData.get("maxParticipants") as string) || undefined,
    minRating: (formData.get("minRating") as string) || undefined,
    maxRating: (formData.get("maxRating") as string) || undefined,
    minAge: (formData.get("minAge") as string) || undefined,
    maxAge: (formData.get("maxAge") as string) || undefined,
    allowedGender: (formData.get("allowedGender") as string) || undefined,
  };

  const result = await createEvent(tournamentId, data);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors, fields };
  if ("error" in result) return { error: result.error, fields };

  redirect(`/tournaments/${tournamentId}/events/${result.event.id}/manage`);
}

// tournamentId is pre-bound via .bind(null, tournamentId)
export async function deleteTournamentAction(tournamentId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const result = await deleteTournament(tournamentId, userId);
  if ("error" in result) throw new Error(result.error);

  redirect("/tournament-directors");
}

export async function deleteEventAction(eventId: string, tournamentId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const result = await deleteEvent(eventId, userId);
  if ("error" in result) throw new Error(result.error);

  redirect(`/tournaments/${tournamentId}/manage`);
}

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function addEntrantAction(
  eventId: string,
  tournamentId: string,
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in." };

  const tournament = await getTournamentDetail(tournamentId);
  if (!tournament || !(await isAuthorizedAsTD(userId, tournament))) {
    return { error: "Not authorized." };
  }

  const event = await getEventDetail(eventId);
  if (!event) return { error: "Event not found." };
  if (event.status === "IN_PROGRESS" || event.status === "COMPLETED") {
    return { error: "Cannot add entrants after the event has started." };
  }

  const playerProfileId = formData.get("playerProfileId") as string;
  if (playerProfileId) {
    const result = await addEntrant(eventId, { playerProfileId });
    if ("error" in result) return { error: result.error };
  }

  redirect(`/tournaments/${tournamentId}/events/${eventId}/manage/entrants`);
}

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function addBulkEntrantsAction(
  eventId: string,
  tournamentId: string,
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in." };

  const tournament = await getTournamentDetail(tournamentId);
  if (!tournament || !(await isAuthorizedAsTD(userId, tournament))) {
    return { error: "Not authorized." };
  }

  const event = await getEventDetail(eventId);
  if (!event) return { error: "Event not found." };
  if (event.status === "IN_PROGRESS" || event.status === "COMPLETED") {
    return { error: "Cannot add entrants after the event has started." };
  }

  const playerProfileIds = formData.getAll("playerProfileIds") as string[];
  for (const playerProfileId of playerProfileIds) {
    const result = await addEntrant(eventId, { playerProfileId });
    // Skip already-entered players silently; surface other errors
    if ("error" in result && result.error !== "This player is already entered in this event.") {
      return { error: result.error };
    }
  }

  redirect(`/tournaments/${tournamentId}/events/${eventId}/manage/entrants`);
}

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function signUpForEventAction(
  eventId: string,
  tournamentId: string,
  _prevState: TournamentActionState,
  _formData: FormData,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in to register for an event." };

  const profile = await getMyProfile();
  if (!profile) return { error: "You need a player profile to register for events." };

  const event = await getEventDetail(eventId);
  if (!event) return { error: "Event not found." };

  const playerRating = await findPlayerRatingByCategory(profile.id, event.ratingCategoryId);

  const result = await selfSignUpForEvent(eventId, profile.id, playerRating, profile);
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${tournamentId}/events/${eventId}`);
}

export type RegisterActionState = {
  errors: Record<string, string>;
  generalError?: string;
} | null;

// tournamentId is pre-bound via .bind(null, tournamentId)
export async function registerForEventsAction(
  tournamentId: string,
  _prevState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const { userId } = await auth();
  if (!userId) return { errors: {}, generalError: "You must be signed in to register." };

  const profile = await getMyProfile();
  if (!profile) return { errors: {}, generalError: "You need a player profile to register." };

  const eventIds = formData.getAll("eventIds") as string[];
  if (eventIds.length === 0) {
    return { errors: {}, generalError: "Please select at least one event." };
  }

  const { results } = await registerForEvents(eventIds, profile.id, profile);

  const errors: Record<string, string> = {};
  for (const [eventId, result] of Object.entries(results)) {
    if ("error" in result) errors[eventId] = result.error;
  }

  if (Object.keys(errors).length === 0) {
    redirect(`/tournaments/${tournamentId}`);
  }

  return { errors };
}

// eventId, tournamentId, playerProfileId are pre-bound via .bind(null, eventId, tournamentId, playerProfileId)
export async function removeEntrantAction(
  eventId: string,
  tournamentId: string,
  playerProfileId: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const result = await tdRemoveEntrant(eventId, playerProfileId, userId);
  if ("error" in result) throw new Error(result.error);

  redirect(`/tournaments/${tournamentId}/events/${eventId}/manage/entrants`);
}

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function withdrawFromEventAction(
  eventId: string,
  tournamentId: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getMyProfile();
  if (!profile) throw new Error("You need a player profile to withdraw.");

  const result = await withdrawFromEvent(eventId, profile.id);
  if ("error" in result) throw new Error(result.error);

  redirect(`/tournaments/${tournamentId}/register`);
}
