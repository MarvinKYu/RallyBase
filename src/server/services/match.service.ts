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
  findThirdPlaceMatch,
} from "@/server/repositories/bracket.repository";
import { generateSEStage } from "@/server/services/bracket.service";
import { prisma } from "@/lib/prisma";

// ── Stage-aware format resolution ─────────────────────────────────────────────

/**
 * Returns the effective match format and point target for a given match.
 * For RR_TO_SE events, RR-stage matches (groupNumber != null) use rrFormat/rrGamePointTarget
 * when set; SE-stage matches always use format/gamePointTarget.
 */
function getMatchEffectiveFormat(match: {
  groupNumber: number | null;
  event: {
    format: string;
    gamePointTarget: number;
    rrFormat: string | null;
    rrGamePointTarget: number | null;
  };
}): { format: string; gamePointTarget: number } {
  if (match.groupNumber !== null && match.event.rrFormat && match.event.rrGamePointTarget != null) {
    return { format: match.event.rrFormat, gamePointTarget: match.event.rrGamePointTarget };
  }
  return { format: match.event.format, gamePointTarget: match.event.gamePointTarget };
}

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

  // Validate game scores against the effective format for this match's stage
  const { format: effectiveFormat, gamePointTarget: effectivePointTarget } =
    getMatchEffectiveFormat(match);
  const validation = validateMatchSubmission(games, effectiveFormat, effectivePointTarget);
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
      if (isUniqueViolation) continue; // code collision — retry with a new code
      if (e instanceof Error && e.message === "MATCH_ALREADY_SUBMITTED") {
        return { error: "A submission is already pending confirmation for this match" };
      }
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

  // ── Verification ─────────────────────────────────────────────────────────────

  if (verificationMethod === "CODE") {
    // Self-confirm blocked entirely
    if (isSelfConfirm) return { error: "You cannot confirm your own submission" };
    if (!confirmationCode) return { error: "Confirmation code is required" };
    if (submission.confirmationCode !== confirmationCode) return { error: "Invalid confirmation code" };

  } else if (verificationMethod === "BIRTH_YEAR") {
    // Self-confirm allowed — confirmer enters the non-submitter's birth year
    const nonSubmitter = submission.submittedById === match.player1Id ? match.player2 : match.player1;
    if (!nonSubmitter?.birthDate) {
      return { error: "Opponent's date of birth is not on file — cannot verify by birth year" };
    }
    const nonSubmitterYear = new Date(nonSubmitter.birthDate).getUTCFullYear().toString();
    if (!birthYear) return { error: "Birth year is required" };
    if (birthYear !== nonSubmitterYear) return { error: "Incorrect birth year" };

  } else if (verificationMethod === "BOTH") {
    const nonSubmitter = submission.submittedById === match.player1Id ? match.player2 : match.player1;
    const nonSubmitterYear = nonSubmitter?.birthDate
      ? new Date(nonSubmitter.birthDate).getUTCFullYear().toString()
      : null;

    if (isSelfConfirm) {
      // Self-confirm: birth year only (submitter already knows the code they generated)
      if (!nonSubmitterYear) {
        return { error: "Opponent's date of birth is not on file — cannot verify by birth year" };
      }
      if (!birthYear) return { error: "Birth year is required" };
      if (birthYear !== nonSubmitterYear) return { error: "Incorrect birth year" };
    } else {
      // Opponent confirming: either code OR birth year is sufficient
      if (!confirmationCode && !birthYear) {
        return { error: "Please provide a confirmation code or your opponent's birth year" };
      }
      const codeValid = !!confirmationCode && confirmationCode === submission.confirmationCode;
      let birthYearValid = false;
      if (birthYear) {
        if (!nonSubmitterYear) {
          // Birth year path blocked; fall back to code
          if (!codeValid) {
            return { error: "Opponent's date of birth is not on file — cannot verify by birth year" };
          }
        } else {
          birthYearValid = birthYear === nonSubmitterYear;
        }
      }
      if (!codeValid && !birthYearValid) {
        if (confirmationCode && !birthYear) return { error: "Invalid confirmation code" };
        if (birthYear && !confirmationCode) return { error: "Incorrect birth year" };
        return { error: "Neither the confirmation code nor the birth year matched" };
      }
    }
  }

  if (
    match.player1Id !== confirmingProfileId &&
    match.player2Id !== confirmingProfileId
  ) {
    return { error: "You are not a player in this match" };
  }

  // Re-validate to ensure submission is still coherent
  const { format: effectiveFormat, gamePointTarget: effectivePointTarget } =
    getMatchEffectiveFormat(match);
  const validation = validateMatchSubmission(
    submission.games.map((g) => ({
      player1Points: g.player1Points,
      player2Points: g.player2Points,
    })),
    effectiveFormat,
    effectivePointTarget,
  );
  if (!validation.valid) {
    return { error: `Submission is invalid: ${validation.error}` };
  }

  const winnerId =
    validation.winner === "player1" ? match.player1Id! : match.player2Id!;

  // Determine the slot the winner fills in the next match
  const nextMatchSlot = match.nextMatchId ? winnerSlotInNextMatch(match.position) : null;

  try {
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
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_CONFIRMED") {
      return { error: "This match result has already been confirmed" };
    }
    throw e;
  }

  // Apply rating changes — runs only after confirmSubmission succeeds
  const loserId = winnerId === match.player1Id ? match.player2Id! : match.player1Id!;
  await applyRatingResult({
    winnerProfileId: winnerId,
    loserProfileId: loserId,
    ratingCategoryId: match.event.ratingCategoryId,
    matchId,
  });

  // Route SF loser to 3rd/4th place match (no-op if not applicable)
  if (match.event.hasThirdPlaceMatch) {
    await routeLoserToThirdPlace(match.eventId, loserId, match.nextMatch ?? null);
  }

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

  const { format: effectiveFormat, gamePointTarget: effectivePointTarget } =
    getMatchEffectiveFormat(match);
  const validation = validateMatchSubmission(games, effectiveFormat, effectivePointTarget);
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

  // Route SF loser to 3rd/4th place match (no-op if not applicable)
  if (match.event.hasThirdPlaceMatch && loserId) {
    await routeLoserToThirdPlace(match.eventId, loserId, match.nextMatch ?? null);
  }

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

  // Route SF loser to 3rd/4th place match (no-op if not applicable)
  if (match.event.hasThirdPlaceMatch) {
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    if (loserId) {
      await routeLoserToThirdPlace(match.eventId, loserId, match.nextMatch ?? null);
    }
  }

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

  // Capture loser before voiding (winnerId is cleared by voidMatch)
  const loserId =
    match.winnerId === match.player1Id ? match.player2?.id ?? null : match.player1?.id ?? null;

  await voidMatch(matchId);

  // Clear loser from 3rd/4th place match if this was an SF (no-op otherwise)
  if (match.event.hasThirdPlaceMatch && loserId) {
    await clearLoserFromThirdPlace(match.eventId, loserId, match.nextMatch ?? null);
  }

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
 * If the just-completed match was a semifinal in an event with hasThirdPlaceMatch,
 * routes the loser into the 3rd/4th place match (filling whichever player slot is empty).
 *
 * A match is a semifinal when its nextMatch exists, has no further advancement
 * (nextMatch.nextMatchId === null), and is not itself the 3rd place match.
 */
async function routeLoserToThirdPlace(
  eventId: string,
  loserId: string,
  nextMatch: { nextMatchId: string | null; isThirdPlaceMatch: boolean } | null,
): Promise<void> {
  if (!nextMatch) return; // this IS the Final or 3rd place match — not an SF
  if (nextMatch.nextMatchId !== null) return; // nextMatch is not the Final (QF or earlier)
  if (nextMatch.isThirdPlaceMatch) return; // this match feeds into 3rd place, not SF

  // nextMatch is the Final → current match is an SF. Route loser to 3rd place match.
  const thirdPlaceMatch = await findThirdPlaceMatch(eventId);
  if (!thirdPlaceMatch) return;
  if (thirdPlaceMatch.player1Id !== null && thirdPlaceMatch.player2Id !== null) return;

  const slot = thirdPlaceMatch.player1Id === null ? "player1Id" : "player2Id";
  await prisma.match.update({
    where: { id: thirdPlaceMatch.id },
    data: { [slot]: loserId },
  });
}

/**
 * If the just-voided match was a semifinal in an event with hasThirdPlaceMatch,
 * clears the corresponding player from the 3rd/4th place match.
 */
async function clearLoserFromThirdPlace(
  eventId: string,
  loserId: string | null,
  nextMatch: { nextMatchId: string | null; isThirdPlaceMatch: boolean } | null,
): Promise<void> {
  if (!loserId) return;
  if (!nextMatch) return;
  if (nextMatch.nextMatchId !== null) return;
  if (nextMatch.isThirdPlaceMatch) return;

  const thirdPlaceMatch = await findThirdPlaceMatch(eventId);
  if (!thirdPlaceMatch) return;

  const updates: Record<string, null> = {};
  if (thirdPlaceMatch.player1Id === loserId) updates.player1Id = null;
  if (thirdPlaceMatch.player2Id === loserId) updates.player2Id = null;
  if (Object.keys(updates).length > 0) {
    await prisma.match.update({ where: { id: thirdPlaceMatch.id }, data: updates });
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
