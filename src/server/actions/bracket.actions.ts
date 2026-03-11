"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { generateBracket } from "@/server/services/bracket.service";

// eventId and tournamentId are pre-bound via .bind(null, eventId, tournamentId)
export async function generateBracketAction(
  eventId: string,
  tournamentId: string,
  _formData: FormData,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await generateBracket(eventId);

  redirect(`/tournaments/${tournamentId}/events/${eventId}/bracket`);
}
