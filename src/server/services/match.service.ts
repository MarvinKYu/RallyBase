import { validateMatchSubmission } from "@/server/algorithms/match-validation";
import { winnerSlotInNextMatch } from "@/server/algorithms/bracket";
import {
  findMatchById,
  findPendingSubmissionByMatchId,
  submissionCodeExistsForTournament,
  createSubmission,
  confirmSubmission,
  directCompleteMatch,
  directDefaultMatch,
  voidMatch,
  saveMatchProgressScores,
} from "@/server/repositories/match.repository";
import { applyRatingResult } from "@/server/services/rating.service";
import { isAuthorizedAsTD } from "@/server/services/admin.service";
import { getProfileIdByClerkId } from "@/server/services/player.service";
import {
  setEventStatus,
  countNonCompletedMatches,
  countNonCompletedEvents,
  setTournamentStatus,
} from "@/server/repositories/tournament.repository";
import {
  countIncompleteRRMatches,
  countSEMatches,
  countNonCompletedSEMatches,
} from "@/server/repositories/bracket.repository";
import { generateSEStage } from "@/server/services/bracket.service";
import { prisma } from "@/lib/prisma";

// ── Authorization ─────────────────────────────────────────────────────────────

export async function isMatchParticipantOrTD(
  clerkId: string,
  match: {
    player1Id: string | null;
    player2Id: string | null;
    event: { tournament: { createdByClerkId: string | null; organizationId: string } };
  },
): Promise<boolean> {
  if (await isAuthorizedAsTD(clerkId, match.event.tournament)) return true;
  const profileId = await getProfileIdByClerkId(clerkId);
  if (!profileId) return false;
  return profileId === match.player1Id || profileId === match.player2Id;
}

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

  const tournamentId = match.event.tournament.id;

  // Generate a unique code and insert; retry on the rare concurrent-collision case (P2002).
  let submission: Awaited<ReturnType<typeof createSubmission>> | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    if (await submissionCodeExistsForTournament(tournamentId, code)) continue;
    try {
      submission = await createSubmission({
        matchId,
        tournamentId,
        submittedById: submittedByProfileId,
        confirmationCode: code,
        games: playedGames,
      });
      break;
    } catch (e) {
      const isUniqueViolation =
        typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
      if (isUniqueViolation) continue;
      throw e;
    }
  }
  if (!submission) return { error: "Could not generate a unique confirmation code. Please try again." };

  return {
    submission: { id: submission.id, confirmationCode: submission.confirmationCode },
  };
}

// ── Confirm result ────────────────────────────────────────────────────────────

export interface ConfirmResultParams {
  matchId: string;
  confirmationCode?: string;
  birthYear?: string;
  confirmingProfileId: string;
}

export type ConfirmResultResult =
  | { success: true; tournamentId: string; eventId: string }
  | { error: string };

export async function confirmMatchResult(
  params: ConfirmResultParams,
): Promise<ConfirmResultResult> {
  const { matchId, confirmationCode, birthYear, confirmingProfileId } = params;

  const submission = await findPendingSubmissionByMatchId(matchId);
  if (!submission) return { error: "No pending submission found for this match" };

  const match = submission.match;
  const verificationMethod = match.event.tournament.verificationMethod;
  const isSelfConfirm = submission.submittedById === confirmingProfileId;

  // CODE-only tournaments never allow self-confirmation
  if (isSelfConfirm && verificationMethod === "CODE") {
    return { error: "You cannot confirm your own submission" };
  }

  // Code verification: required for CODE always; required for BOTH only when not self-confirming
  // (self-confirm on BOTH uses birth year as the sole verification path)
  if (verificationMethod === "CODE" || (verificationMethod === "BOTH" && !isSelfConfirm)) {
    if (!confirmationCode) return { error: "Confirmation code is required" };
    if (submission.confirmationCode !== confirmationCode) return { error: "Invalid confirmation code" };
  }

  // Birth year verification: required for BIRTH_YEAR and BOTH always
  if (verificationMethod === "BIRTH_YEAR" || verificationMethod === "BOTH") {
    if (!birthYear) return { error: "Birth year is required" };
    // Confirmer must enter the non-submitting player's birth year
    const nonSubmitter =
      submission.submittedById === match.player1Id ? match.player2 : match.player1;
    if (!nonSubmitter?.birthDate) {
      return { error: "Opponent's date of birth is not on file — cannot verify by birth year" };
    }
    const nonSubmitterYear = new Date(nonSubmitter.birthDate).getUTCFullYear().toString();
    if (birthYear !== nonSubmitterYear) return { error: "Incorrect birth year" };
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
  await tryAutoGenerateSEStage(match.eventId, match.event.eventFormat);

  // Auto-complete event if all matches are now done.
  // For RR_TO_SE events: only complete once the SE bracket exists and is fully played.
  if (match.event.status === "IN_PROGRESS") {
    const shouldComplete = await checkEventComplete(match.eventId, match.event.eventFormat);
    if (shouldComplete) {
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
  await tryAutoGenerateSEStage(match.eventId, match.event.eventFormat);

  // Auto-complete event if all matches are now done.
  // For RR_TO_SE events: only complete once the SE bracket exists and is fully played.
  if (match.event.status === "IN_PROGRESS") {
    const shouldComplete = await checkEventComplete(match.eventId, match.event.eventFormat);
    if (shouldComplete) {
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
    const shouldComplete = await checkEventComplete(match.eventId, match.event.eventFormat);
    if (shouldComplete) {
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
          ...(txn.rdBefore != null ? { rd: txn.rdBefore } : {}),
          ...(txn.sigmaBefore != null ? { sigma: txn.sigmaBefore } : {}),
          ...(txn.lastActiveDayBefore !== null ? { lastActiveDay: txn.lastActiveDayBefore } : {}),
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
): Promise<void> {
  if (eventFormat !== "RR_TO_SE") return;

  try {
    // Skip if SE bracket already exists (idempotent guard)
    const seCount = await countSEMatches(eventId);
    if (seCount > 0) return;

    const incompleteRR = await countIncompleteRRMatches(eventId);
    if (incompleteRR > 0) return;

    // All RR matches done — attempt SE generation (may fail silently if tie exists)
    await generateSEStage(eventId);
  } catch {
    // Silently ignore — TD will see the state on the manage page
  }
}

/**
 * Returns true if the event should be auto-completed.
 * For RR_TO_SE: requires the SE bracket to exist and have no incomplete matches.
 * For all other formats: requires no incomplete matches at all.
 */
async function checkEventComplete(eventId: string, eventFormat: string): Promise<boolean> {
  if (eventFormat === "RR_TO_SE") {
    const [seTotal, seIncomplete] = await Promise.all([
      countSEMatches(eventId),
      countNonCompletedSEMatches(eventId),
    ]);
    return seTotal > 0 && seIncomplete === 0;
  }
  const remaining = await countNonCompletedMatches(eventId);
  return remaining === 0;
}
