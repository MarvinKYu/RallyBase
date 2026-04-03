import { prisma } from "@/lib/prisma";
import { getAlgorithmForOrg } from "@/server/algorithms/rating-algorithm";
import {
  findPlayerRatingsByProfileId,
  findPlayerRatingByCategory,
  findRatingTransactionsByProfileAndCategory,
  findAllRatingTransactionsByProfile,
} from "@/server/repositories/rating.repository";

/** Returns all current rating snapshots for a player, across all rating categories. */
export async function getPlayerRatings(playerProfileId: string) {
  return findPlayerRatingsByProfileId(playerProfileId);
}

/** Returns the full rating transaction ledger for one player in one rating category, newest first. */
export async function getRatingHistoryForPlayer(
  playerProfileId: string,
  ratingCategoryId: string,
) {
  return findRatingTransactionsByProfileAndCategory(playerProfileId, ratingCategoryId);
}

/** Returns all rating transactions for a player across all categories, chronological order. */
export async function getPlayerRatingHistories(playerProfileId: string) {
  return findAllRatingTransactionsByProfile(playerProfileId);
}

export interface ApplyRatingResultParams {
  winnerProfileId: string;
  loserProfileId: string;
  ratingCategoryId: string;
  matchId?: string;
}

export interface ApplyRatingResultOutput {
  winner: { ratingBefore: number; ratingAfter: number; delta: number };
  loser: { ratingBefore: number; ratingAfter: number; delta: number };
}

type PlayerRatingWithGlickoState = {
  rating: number;
  gamesPlayed: number;
  rd?: number | null;
  sigma?: number | null;
  lastActiveDay?: number | null;
};

function isJuniorAtMatchTime(birthDate: Date | null): boolean {
  if (!birthDate) return false;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (today < birthdayThisYear) age--;

  return age < 21;
}

/**
 * Applies rating changes for a confirmed match result.
 *
 * - Upserts `player_ratings` for winner and loser (current snapshot)
 * - Inserts two `rating_transactions` entries (immutable ledger)
 * - All writes happen inside a single DB transaction
 */
export async function applyRatingResult(
  params: ApplyRatingResultParams,
): Promise<ApplyRatingResultOutput> {
  const { winnerProfileId, loserProfileId, ratingCategoryId, matchId } = params;

  const [winnerRating, loserRating, ratingCategory, winnerProfile, loserProfile] = await Promise.all([
    findPlayerRatingByCategory(winnerProfileId, ratingCategoryId),
    findPlayerRatingByCategory(loserProfileId, ratingCategoryId),
    prisma.ratingCategory.findUnique({
      where: { id: ratingCategoryId },
      select: { organization: { select: { slug: true } } },
    }),
    prisma.playerProfile.findUnique({
      where: { id: winnerProfileId },
      select: { birthDate: true },
    }),
    prisma.playerProfile.findUnique({
      where: { id: loserProfileId },
      select: { birthDate: true },
    }),
  ]);

  const orgSlug = ratingCategory?.organization.slug ?? "";
  const algorithm = getAlgorithmForOrg(orgSlug);
  const winnerRatingState = (winnerRating ?? null) as PlayerRatingWithGlickoState | null;
  const loserRatingState = (loserRating ?? null) as PlayerRatingWithGlickoState | null;
  const winnerBefore = winnerRatingState?.rating ?? algorithm.defaultRating;
  const loserBefore = loserRatingState?.rating ?? algorithm.defaultRating;
  const winnerGamesPlayed = winnerRatingState?.gamesPlayed ?? 0;
  const loserGamesPlayed = loserRatingState?.gamesPlayed ?? 0;
  const epochMs = new Date("2025-01-01").getTime();
  const matchDay = Math.floor((Date.now() - epochMs) / 86_400_000);
  const winnerIsJunior = isJuniorAtMatchTime(winnerProfile?.birthDate ?? null);
  const loserIsJunior = isJuniorAtMatchTime(loserProfile?.birthDate ?? null);

  const { winner, loser } = algorithm.calcMatchResult({
    winnerRating: winnerBefore,
    loserRating: loserBefore,
    winnerGamesPlayed,
    loserGamesPlayed,
    winnerRd: winnerRatingState?.rd,
    loserRd: loserRatingState?.rd,
    winnerSigma: winnerRatingState?.sigma,
    loserSigma: loserRatingState?.sigma,
    winnerLastActiveDay: winnerRatingState?.lastActiveDay,
    loserLastActiveDay: loserRatingState?.lastActiveDay,
    winnerIsJunior,
    loserIsJunior,
    matchDay,
  });

  const winnerRatingUpdate = {
    rating: winner.newRating,
    gamesPlayed: { increment: 1 as const },
    ...(winner.newRd != null ? { rd: winner.newRd } : {}),
    ...(winner.newSigma != null ? { sigma: winner.newSigma } : {}),
    ...(winner.newRd != null || winner.newSigma != null ? { lastActiveDay: matchDay } : {}),
  };

  const winnerRatingCreate = {
    playerProfileId: winnerProfileId,
    ratingCategoryId,
    rating: winner.newRating,
    gamesPlayed: 1,
    ...(winner.newRd != null ? { rd: winner.newRd } : {}),
    ...(winner.newSigma != null ? { sigma: winner.newSigma } : {}),
    ...(winner.newRd != null || winner.newSigma != null ? { lastActiveDay: matchDay } : {}),
  };

  const loserRatingUpdate = {
    rating: loser.newRating,
    gamesPlayed: { increment: 1 as const },
    ...(loser.newRd != null ? { rd: loser.newRd } : {}),
    ...(loser.newSigma != null ? { sigma: loser.newSigma } : {}),
    ...(loser.newRd != null || loser.newSigma != null ? { lastActiveDay: matchDay } : {}),
  };

  const loserRatingCreate = {
    playerProfileId: loserProfileId,
    ratingCategoryId,
    rating: loser.newRating,
    gamesPlayed: 1,
    ...(loser.newRd != null ? { rd: loser.newRd } : {}),
    ...(loser.newSigma != null ? { sigma: loser.newSigma } : {}),
    ...(loser.newRd != null || loser.newSigma != null ? { lastActiveDay: matchDay } : {}),
  };

  await prisma.$transaction(async (tx) => {
    await tx.playerRating.upsert({
      where: {
        playerProfileId_ratingCategoryId: {
          playerProfileId: winnerProfileId,
          ratingCategoryId,
        },
      },
      update: winnerRatingUpdate,
      create: winnerRatingCreate,
    });

    await tx.playerRating.upsert({
      where: {
        playerProfileId_ratingCategoryId: {
          playerProfileId: loserProfileId,
          ratingCategoryId,
        },
      },
      update: loserRatingUpdate,
      create: loserRatingCreate,
    });

    await tx.ratingTransaction.create({
      data: {
        playerProfileId: winnerProfileId,
        ratingCategoryId,
        matchId,
        ratingBefore: winnerBefore,
        ratingAfter: winner.newRating,
        delta: winner.delta,
      },
    });

    await tx.ratingTransaction.create({
      data: {
        playerProfileId: loserProfileId,
        ratingCategoryId,
        matchId,
        ratingBefore: loserBefore,
        ratingAfter: loser.newRating,
        delta: loser.delta,
      },
    });
  });

  return {
    winner: { ratingBefore: winnerBefore, ratingAfter: winner.newRating, delta: winner.delta },
    loser: { ratingBefore: loserBefore, ratingAfter: loser.newRating, delta: loser.delta },
  };
}
