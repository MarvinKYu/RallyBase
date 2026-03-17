"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { generateBracket } from "@/server/services/bracket.service";
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
  const dest = event?.eventFormat === "ROUND_ROBIN" ? "standings" : "bracket";
  redirect(`/tournaments/${tournamentId}/events/${eventId}/${dest}`);
}
