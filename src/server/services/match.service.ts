import { validateMatchSubmission, MAX_GAMES } from "@/server/algorithms/match-validation";
import { winnerSlotInNextMatch } from "@/server/algorithms/bracket";
import {
  findMatchById,
  findSubmissionByCode,
  createSubmission,
  confirmSubmission,
} from "@/server/repositories/match.repository";
import { applyRatingResult } from "@/server/services/rating.service";

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getMatchWithSubmission(matchId: string) {
  return findMatchById(matchId);
}

// ── Submit result ─────────────────────────────────────────────────────────────

export interface SubmitResultParams {
  matchId: string;
  submittedByProfileId: string;
  games: Array<{ player1Points: number; player2Points: number }>;
}

export type SubmitResultResult =
  | { submission: { id: string; confirmationCode: string } }
  | { error: string };

export async function submitMatchResult(
  params: SubmitResultParams,
): Promise<SubmitResultResult> {
  const { matchId, submittedByProfileId, games } = params;

  const match = await findMatchById(matchId);
  if (!match) return { error: "Match not found" };

  if (match.status === "COMPLETED") {
    return { error: "This match is already completed" };
  }
  if (match.status === "AWAITING_CONFIRMATION") {
    return { error: "A submission is already pending confirmation for this match" };
  }
  if (!match.player1Id || !match.player2Id) {
    return { error: "Both players must be set before submitting a result" };
  }
  if (
    match.player1Id !== submittedByProfileId &&
    match.player2Id !== submittedByProfileId
  ) {
    return { error: "You are not a player in this match" };
  }

  // Validate game scores against the event's format and point target
  const validation = validateMatchSubmission(
    games,
    match.event.format,
    match.event.gamePointTarget,
  );
  if (!validation.valid) return { error: validation.error };

  // Only persist the games that were actually played
  const playedGames = games
    .slice(0, validation.gamesPlayed)
    .map((g, i) => ({ gameNumber: i + 1, ...g }));

  const submission = await createSubmission({
    matchId,
    submittedById: submittedByProfileId,
    games: playedGames,
  });

  return {
    submission: { id: submission.id, confirmationCode: submission.confirmationCode },
  };
}

// ── Confirm result ────────────────────────────────────────────────────────────

export interface ConfirmResultParams {
  matchId: string;
  confirmationCode: string;
  confirmingProfileId: string;
}

export type ConfirmResultResult =
  | { success: true; tournamentId: string; eventId: string }
  | { error: string };

export async function confirmMatchResult(
  params: ConfirmResultParams,
): Promise<ConfirmResultResult> {
  const { matchId, confirmationCode, confirmingProfileId } = params;

  const submission = await findSubmissionByCode(confirmationCode);
  if (!submission) return { error: "Invalid confirmation code" };
  if (submission.matchId !== matchId) return { error: "This code is not for this match" };
  if (submission.status !== "PENDING") {
    return { error: "This submission has already been processed" };
  }

  const match = submission.match;

  // The confirmer must be the opposing player — not the one who submitted
  if (submission.submittedById === confirmingProfileId) {
    return { error: "You cannot confirm your own submission" };
  }
  if (
    match.player1Id !== confirmingProfileId &&
    match.player2Id !== confirmingProfileId
  ) {
    return { error: "You are not a player in this match" };
  }

  // Re-validate to ensure submission is still coherent
  const validation = validateMatchSubmission(
    submission.games.map((g) => ({
      player1Points: g.player1Points,
      player2Points: g.player2Points,
    })),
    match.event.format,
    match.event.gamePointTarget,
  );
  if (!validation.valid) {
    return { error: `Submission is invalid: ${validation.error}` };
  }

  const winnerId =
    validation.winner === "player1" ? match.player1Id! : match.player2Id!;

  // Determine the slot the winner fills in the next match
  const nextMatchSlot = match.nextMatchId ? winnerSlotInNextMatch(match.position) : null;

  await confirmSubmission({
    submissionId: submission.id,
    matchId,
    winnerId,
    nextMatchId: match.nextMatchId,
    nextMatchSlot,
    games: submission.games.map((g) => ({
      gameNumber: g.gameNumber,
      player1Points: g.player1Points,
      player2Points: g.player2Points,
    })),
  });

  // Apply Elo rating changes for both players
  const loserId = winnerId === match.player1Id ? match.player2Id! : match.player1Id!;
  await applyRatingResult({
    winnerProfileId: winnerId,
    loserProfileId: loserId,
    ratingCategoryId: match.event.ratingCategoryId,
    matchId,
  });

  return {
    success: true,
    tournamentId: match.event.tournament.id,
    eventId: match.eventId,
  };
}
