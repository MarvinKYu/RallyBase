"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createTournament, deleteTournament, createEvent, addEntrant } from "@/server/services/tournament.service";

export type TournamentActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
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
  };

  const result = await createTournament(data, userId);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${result.tournament.id}`);
}

// tournamentId is pre-bound via .bind(null, tournamentId) in the client component
export async function createEventAction(
  tournamentId: string,
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in to create an event." };

  const data = {
    ratingCategoryId: formData.get("ratingCategoryId") as string,
    name: formData.get("name") as string,
    format: formData.get("format") as string,
    gamePointTarget: formData.get("gamePointTarget") as string,
  };

  const result = await createEvent(tournamentId, data);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${tournamentId}/events/${result.event.id}`);
}

// tournamentId is pre-bound via .bind(null, tournamentId)
export async function deleteTournamentAction(tournamentId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const result = await deleteTournament(tournamentId, userId);
  if ("error" in result) throw new Error(result.error);

  redirect("/tournaments");
}

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
// Used as a direct <form action={...}> — no prevState parameter
export async function addEntrantAction(
  eventId: string,
  tournamentId: string,
  formData: FormData,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const playerProfileId = formData.get("playerProfileId") as string;
  if (playerProfileId) {
    await addEntrant(eventId, { playerProfileId });
  }

  redirect(`/tournaments/${tournamentId}/events/${eventId}`);
}
