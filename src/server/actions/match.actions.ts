"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getMyProfile } from "@/server/services/player.service";
import { submitMatchResult, confirmMatchResult, tdSubmitMatch, tdVoidMatch, tdDefaultMatch, saveMatchProgress } from "@/server/services/match.service";
import { getMatchWithSubmission } from "@/server/services/match.service";
import { isAuthorizedAsTD } from "@/server/services/admin.service";
import { MAX_GAMES } from "@/server/algorithms/match-validation";
import { confirmResultSchema } from "@/lib/schemas/match";
import { confirmCodeRatelimit, submitResultRatelimit } from "@/lib/rate-limit";

export type MatchActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
} | null;

// matchId, tournamentId, eventId, format, verificationMethod are pre-bound via .bind()
export async function submitResultAction(
  matchId: string,
  tournamentId: string,
  eventId: string,
  format: string,
  verificationMethod: string,
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const profile = await getMyProfile();
  if (!profile) return { error: "You need a player profile to submit results" };

  const { success: withinLimit } = await submitResultRatelimit.limit(profile.id);
  if (!withinLimit) return { error: "Too many attempts. Please wait before trying again." };

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

  redirect(
    verificationMethod === "BIRTH_YEAR"
      ? `/matches/${matchId}/confirm`
      : `/matches/${matchId}/pending`,
  );
}

// matchId, maxGames are pre-bound via .bind()
export async function saveMatchProgressAction(
  matchId: string,
  maxGames: number,
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const profile = await getMyProfile();
  if (!profile) return { error: "You need a player profile to save progress" };

  const games = Array.from({ length: maxGames }, (_, i) => ({
    gameNumber: i + 1,
    player1Points:
      parseInt((formData.get(`games.${i}.player1Points`) as string) ?? "0", 10) || 0,
    player2Points:
      parseInt((formData.get(`games.${i}.player2Points`) as string) ?? "0", 10) || 0,
  }));

  const result = await saveMatchProgress({
    matchId,
    savedByProfileId: profile.id,
    games,
  });

  if ("error" in result) return { error: result.error };
  return { success: true };
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

  const { success: withinLimit } = await confirmCodeRatelimit.limit(profile.id);
  if (!withinLimit) return { error: "Too many attempts. Please wait before trying again." };

  const confirmationCode = (formData.get("confirmationCode") as string)?.trim() || undefined;
  const birthYear = (formData.get("birthYear") as string)?.trim() || undefined;

  const parsed = confirmResultSchema.safeParse({ confirmationCode, birthYear });
  if (!parsed.success) return { error: "Invalid input." };

  const result = await confirmMatchResult({
    matchId,
    confirmationCode,
    birthYear,
    confirmingProfileId: profile.id,
  });

  if ("error" in result) return { error: result.error };

  redirect(`/tournaments/${result.tournamentId}/events/${result.eventId}/bracket`);
}

// ── TD Actions ────────────────────────────────────────────────────────────────

// matchId, tournamentId, eventId, format, redirectTo are pre-bound via .bind()
export async function tdSubmitResultAction(
  matchId: string,
  tournamentId: string,
  eventId: string,
  format: string,
  redirectTo: string,
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  // Verify TD authorization
  const match = await getMatchWithSubmission(matchId);
  if (!match) return { error: "Match not found" };
  if (!(await isAuthorizedAsTD(userId, match.event.tournament))) {
    return { error: "Not authorized" };
  }

  const maxGames = MAX_GAMES[format] ?? 5;
  const games = Array.from({ length: maxGames }, (_, i) => ({
    player1Points:
      parseInt((formData.get(`games.${i}.player1Points`) as string) ?? "0", 10) || 0,
    player2Points:
      parseInt((formData.get(`games.${i}.player2Points`) as string) ?? "0", 10) || 0,
  }));

  const result = await tdSubmitMatch({ matchId, games });
  if ("error" in result) return { error: result.error };

  redirect(redirectTo);
}

// matchId, tournamentId, eventId, winnerId, redirectTo are pre-bound via .bind()
export async function tdDefaultMatchAction(
  matchId: string,
  tournamentId: string,
  eventId: string,
  winnerId: string,
  redirectTo: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const match = await getMatchWithSubmission(matchId);
  if (!match) throw new Error("Match not found");
  if (!(await isAuthorizedAsTD(userId!, match.event.tournament))) {
    throw new Error("Not authorized");
  }

  const result = await tdDefaultMatch({ matchId, winnerId });
  if ("error" in result) throw new Error(result.error);

  redirect(redirectTo);
}

// matchId, tournamentId, eventId, returnTo are pre-bound via .bind()
export async function tdVoidMatchAction(
  matchId: string,
  tournamentId: string,
  eventId: string,
  returnTo: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const match = await getMatchWithSubmission(matchId);
  if (!match) throw new Error("Match not found");
  if (!(await isAuthorizedAsTD(userId!, match.event.tournament))) {
    throw new Error("Not authorized");
  }

  const result = await tdVoidMatch(matchId);
  if ("error" in result) throw new Error(result.error);

  redirect(returnTo);
}
