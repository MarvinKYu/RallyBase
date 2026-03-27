import { validateMatchSubmission } from "@/server/algorithms/match-validation";
import { winnerSlotInNextMatch } from "@/server/algorithms/bracket";
import {
  findMatchById,
  findSubmissionByCode,
  createSubmission,
  confirmSubmission,
  directCompleteMatch,
  directDefaultMatch,
  voidMatch,
  saveMatchProgressScores,
} from "@/server/repositories/match.repository";
import { applyRatingResult } from "@/server/services/rating.service";
import {
  setEventStatus,
  countNonCompletedMatches,
  countNonCompletedEvents,
  setTournamentStatus,
} from "@/server/repositories/tournament.repository";
import { countIncompleteRRMatches } from "@/server/repositories/bracket.repository";
import { generateSEStage } from "@/server/services/bracket.service";
import { prisma } from "@/lib/prisma";

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getMatchWithSubmission(matchId: string) {
  return findMatchById(matchId);
}

// ── Save progress ─────────────────────────────────────────────────────────────

export type SaveMatchProgressResult = { success: true } | { error: string };

export async function saveMatchProgress(params: {
  matchId: string;
  savedByProfileId: string;
  games: Array<{ gameNumber: number; player1Points: number; player2Points: number }>;
}): Promise<SaveMatchProgressResult> {
  const { matchId, savedByProfileId, games } = params;

  const match = await findMatchById(matchId);
  if (!match) return { error: "Match not found" };

  if (match.status !== "PENDING" && match.status !== "IN_PROGRESS") {
    return { error: "Cannot save progress for this match" };
  }
  if (match.player1Id !== savedByProfileId && match.player2Id !== savedByProfileId) {
    return { error: "You are not a player in this match" };
  }

  const filtered = games.filter((g) => g.player1Points !== 0 || g.player2Points !== 0);
  if (filtered.length === 0) return { error: "No scores to save" };

  await saveMatchProgressScores(matchId, filtered);
  return { success: true };
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

  const confirmationCode = Math.floor(Math.random() * 10000).toString().padStart(4, "0");

  const submission = await createSubmission({
    matchId,
    submittedById: submittedByProfileId,
    confirmationCode,
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

  // RR → SE: auto-generate SE bracket when last RR group match completes
  await tryAutoGenerateSEStage(match.eventId, match.event.eventFormat, match.groupNumber);

  // Auto-complete event if all matches are now done.
  // For RR_TO_SE events where the completed match is a group-stage (RR) match,
  // skip — the SE bracket still needs to be played through.
  const isRRPhaseMatch =
    match.event.eventFormat === "RR_TO_SE" && match.groupNumber !== null;
  if (match.event.status === "IN_PROGRESS" && !isRRPhaseMatch) {
    const remainingMatches = await countNonCompletedMatches(match.eventId);
    if (remainingMatches === 0) {
      await setEventStatus(match.eventId, "COMPLETED");
      const remainingEvents = await countNonCompletedEvents(match.event.tournament.id);
      if (remainingEvents === 0) {
        await setTournamentStatus(match.event.tournament.id, "COMPLETED");
      }
    }
  }

  return {
    success: true,
    tournamentId: match.event.tournament.id,
    eventId: match.eventId,
  };
}

// ── TD actions ────────────────────────────────────────────────────────────────

export interface TdSubmitParams {
  matchId: string;
  games: Array<{ player1Points: number; player2Points: number }>;
}

export type TdSubmitResult =
  | { success: true; tournamentId: string; eventId: string }
  | { error: string };

/**
 * TD submits match result directly — no confirmation code needed.
 */
export async function tdSubmitMatch(params: TdSubmitParams): Promise<TdSubmitResult> {
  const { matchId, games } = params;

  const match = await findMatchById(matchId);
  if (!match) return { error: "Match not found" };

  if (match.status === "COMPLETED") {
    return { error: "This match is already completed" };
  }
  if (!match.player1Id || !match.player2Id) {
    return { error: "Both players must be set before submitting a result" };
  }

  const validation = validateMatchSubmission(
    games,
    match.event.format,
    match.event.gamePointTarget,
  );
  if (!validation.valid) return { error: validation.error };

  const winnerId =
    validation.winner === "player1" ? match.player1Id : match.player2Id;

  const nextMatchSlot = match.nextMatchId ? winnerSlotInNextMatch(match.position) : null;

  const playedGames = games
    .slice(0, validation.gamesPlayed)
    .map((g, i) => ({ gameNumber: i + 1, ...g }));

  await directCompleteMatch({
    matchId,
    winnerId,
    nextMatchId: match.nextMatchId,
    nextMatchSlot,
    games: playedGames,
  });

  const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
  await applyRatingResult({
    winnerProfileId: winnerId,
    loserProfileId: loserId,
    ratingCategoryId: match.event.ratingCategoryId,
    matchId,
  });

  // RR → SE: auto-generate SE bracket when last RR group match completes
  await tryAutoGenerateSEStage(match.eventId, match.event.eventFormat, match.groupNumber);

  // Auto-complete event if all matches are now done.
  // For RR_TO_SE events where the completed match is a group-stage (RR) match,
  // skip — the SE bracket still needs to be played through.
  const isRRPhaseMatch =
    match.event.eventFormat === "RR_TO_SE" && match.groupNumber !== null;
  if (match.event.status === "IN_PROGRESS" && !isRRPhaseMatch) {
    const remainingMatches = await countNonCompletedMatches(match.eventId);
    if (remainingMatches === 0) {
      await setEventStatus(match.eventId, "COMPLETED");
      const remainingEvents = await countNonCompletedEvents(match.event.tournament.id);
      if (remainingEvents === 0) {
        await setTournamentStatus(match.event.tournament.id, "COMPLETED");
      }
    }
  }

  return {
    success: true,
    tournamentId: match.event.tournament.id,
    eventId: match.eventId,
  };
}

export type TdDefaultResult =
  | { success: true; tournamentId: string; eventId: string }
  | { error: string };

/**
 * TD records a default win — no scores, no ratings, winner advances.
 */
export async function tdDefaultMatch(params: {
  matchId: string;
  winnerId: string;
}): Promise<TdDefaultResult> {
  const { matchId, winnerId } = params;

  const match = await findMatchById(matchId);
  if (!match) return { error: "Match not found" };

  if (match.status === "COMPLETED") {
    return { error: "This match is already completed" };
  }
  if (!match.player1Id || !match.player2Id) {
    return { error: "Both players must be set before recording a default" };
  }
  if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
    return { error: "Winner must be one of the match players" };
  }

  const nextMatchSlot = match.nextMatchId ? winnerSlotInNextMatch(match.position) : null;

  await directDefaultMatch({
    matchId,
    winnerId,
    nextMatchId: match.nextMatchId,
    nextMatchSlot,
  });

  if (match.event.status === "IN_PROGRESS") {
    const remainingMatches = await countNonCompletedMatches(match.eventId);
    if (remainingMatches === 0) {
      await setEventStatus(match.eventId, "COMPLETED");
      const remainingEvents = await countNonCompletedEvents(match.event.tournament.id);
      if (remainingEvents === 0) {
        await setTournamentStatus(match.event.tournament.id, "COMPLETED");
      }
    }
  }

  return {
    success: true,
    tournamentId: match.event.tournament.id,
    eventId: match.eventId,
  };
}

export type TdVoidResult =
  | { success: true; tournamentId: string; eventId: string }
  | { error: string };

/**
 * TD voids a match result — reverses ratings, clears scores, resets to PENDING.
 */
export async function tdVoidMatch(matchId: string): Promise<TdVoidResult> {
  const match = await findMatchById(matchId);
  if (!match) return { error: "Match not found" };

  if (match.status !== "COMPLETED" && match.status !== "AWAITING_CONFIRMATION") {
    return { error: "This match has no result to void." };
  }

  // Restore player ratings by reversing the rating transactions for this match
  const transactions = await prisma.ratingTransaction.findMany({
    where: { matchId },
  });

  await prisma.$transaction(async (tx) => {
    for (const txn of transactions) {
      // Restore rating to ratingBefore and decrement gamesPlayed
      await tx.playerRating.update({
        where: {
          playerProfileId_ratingCategoryId: {
            playerProfileId: txn.playerProfileId,
            ratingCategoryId: txn.ratingCategoryId,
          },
        },
        data: {
          rating: txn.ratingBefore,
          gamesPlayed: { decrement: 1 },
        },
      });
    }
  });

  await voidMatch(matchId);

  return {
    success: true,
    tournamentId: match.event.tournament.id,
    eventId: match.eventId,
  };
}

// ── RR → SE auto-trigger ──────────────────────────────────────────────────────

/**
 * After any RR group match is completed, check whether all RR matches in this
 * RR_TO_SE event are now done. If so, attempt to auto-generate the SE bracket.
 * Silently ignores failures (tie blocks) — the manage page surfaces them.
 */
async function tryAutoGenerateSEStage(
  eventId: string,
  eventFormat: string,
  matchGroupNumber: number | null,
): Promise<void> {
  // Only applies to RR_TO_SE events and RR-phase matches (groupNumber IS NOT NULL)
  if (eventFormat !== "RR_TO_SE" || matchGroupNumber === null) return;

  try {
    const incompleteRR = await countIncompleteRRMatches(eventId);
    if (incompleteRR > 0) return;

    // All RR matches done — attempt SE generation (may fail silently if tie exists)
    await generateSEStage(eventId);
  } catch {
    // Silently ignore — TD will see the state on the manage page
  }
}
