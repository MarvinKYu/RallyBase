"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  generateBracket,
  generateSEStage,
  regenerateSEStage,
  resolveTie,
} from "@/server/services/bracket.service";
import { isAuthorizedAsTD } from "@/server/services/admin.service";
import { getTournamentDetail, getEventDetail } from "@/server/services/tournament.service";

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function generateBracketAction(
  eventId: string,
  tournamentId: string,
  _formData: FormData,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentDetail(tournamentId);
  if (!tournament || tournament.createdByClerkId !== userId) {
    redirect(`/tournaments/${tournamentId}/events/${eventId}`);
  }

  await generateBracket(eventId);

  const event = await getEventDetail(eventId);
  const dest =
    event?.eventFormat === "ROUND_ROBIN" || event?.eventFormat === "RR_TO_SE"
      ? "standings"
      : "bracket";
  redirect(`/tournaments/${tournamentId}/events/${eventId}/${dest}`);
}

// ── RR → SE stage actions ────────────────────────────────────────────────────

export async function generateSEStageAction(
  eventId: string,
  tournamentId: string,
  _formData: FormData,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentDetail(tournamentId);
  if (!tournament || !(await isAuthorizedAsTD(userId, tournament))) {
    redirect(`/tournaments/${tournamentId}/events/${eventId}/manage`);
  }

  await generateSEStage(eventId);
  redirect(`/tournaments/${tournamentId}/events/${eventId}/manage`);
}

export async function regenerateSEStageAction(
  eventId: string,
  tournamentId: string,
  _formData: FormData,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentDetail(tournamentId);
  if (!tournament || !(await isAuthorizedAsTD(userId, tournament))) {
    redirect(`/tournaments/${tournamentId}/events/${eventId}/manage`);
  }

  await regenerateSEStage(eventId);
  redirect(`/tournaments/${tournamentId}/events/${eventId}/manage`);
}

/**
 * TD resolves a tie by selecting which player advances.
 * advancingPlayerId and excludedPlayerIds are pre-bound via .bind(null, ...).
 */
export async function resolveTieAction(
  eventId: string,
  tournamentId: string,
  groupNumber: number,
  advancingPlayerId: string,
  excludedPlayerIds: string[],
  _formData: FormData,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentDetail(tournamentId);
  if (!tournament || !(await isAuthorizedAsTD(userId, tournament))) {
    redirect(`/tournaments/${tournamentId}/events/${eventId}/manage`);
  }

  // groupNumber param is used for future logging / auditing; resolution itself is player-scoped
  void groupNumber;

  await resolveTie(eventId, advancingPlayerId, excludedPlayerIds);
  redirect(`/tournaments/${tournamentId}/events/${eventId}/manage`);
}
