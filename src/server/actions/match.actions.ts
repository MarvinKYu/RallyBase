"use server";

import { redirect } from "next/navigation";
import { getMyProfile } from "@/server/services/player.service";
import { submitMatchResult, confirmMatchResult } from "@/server/services/match.service";
import { MAX_GAMES } from "@/server/algorithms/match-validation";

export type MatchActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

// matchId, tournamentId, eventId, format are pre-bound via .bind()
export async function submitResultAction(
  matchId: string,
  tournamentId: string,
  eventId: string,
  format: string,
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const profile = await getMyProfile();
  if (!profile) return { error: "You need a player profile to submit results" };

  const maxGames = MAX_GAMES[format] ?? 5;
  const games = Array.from({ length: maxGames }, (_, i) => ({
    player1Points:
      parseInt((formData.get(`games.${i}.player1Points`) as string) ?? "0", 10) || 0,
    player2Points:
      parseInt((formData.get(`games.${i}.player2Points`) as string) ?? "0", 10) || 0,
  }));

  const result = await submitMatchResult({
    matchId,
    submittedByProfileId: profile.id,
    games,
  });

  if ("error" in result) return { error: result.error };

  redirect(`/matches/${matchId}/pending`);
}

// matchId, tournamentId, eventId are pre-bound via .bind()
export async function confirmResultAction(
  matchId: string,
  tournamentId: string,
  eventId: string,
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const profile = await getMyProfile();
  if (!profile) return { error: "You need a player profile to confirm results" };

  const confirmationCode = (formData.get("confirmationCode") as string)?.trim();
  if (!confirmationCode) return { error: "Confirmation code is required" };

  const result = await confirmMatchResult({
    matchId,
    confirmationCode,
    confirmingProfileId: profile.id,
  });

  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${result.tournamentId}/events/${result.eventId}/bracket`);
}
