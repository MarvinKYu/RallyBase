import { prisma } from "@/lib/prisma";
import { calculateMatchElo, DEFAULT_RATING } from "@/server/algorithms/elo";
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

/**
 * Applies Elo rating changes for a confirmed match result.
 *
 * - Upserts `player_ratings` for winner and loser (current snapshot)
 * - Inserts two `rating_transactions` entries (immutable ledger)
 * - All writes happen inside a single DB transaction
 */
export async function applyRatingResult(
  params: ApplyRatingResultParams,
): Promise<ApplyRatingResultOutput> {
  const { winnerProfileId, loserProfileId, ratingCategoryId, matchId } = params;

  const [winnerRating, loserRating] = await Promise.all([
    findPlayerRatingByCategory(winnerProfileId, ratingCategoryId),
    findPlayerRatingByCategory(loserProfileId, ratingCategoryId),
  ]);

  const winnerBefore = winnerRating?.rating ?? DEFAULT_RATING;
  const loserBefore = loserRating?.rating ?? DEFAULT_RATING;
  const winnerGamesPlayed = winnerRating?.gamesPlayed ?? 0;
  const loserGamesPlayed = loserRating?.gamesPlayed ?? 0;

  const { winner, loser } = calculateMatchElo(
    winnerBefore,
    loserBefore,
    winnerGamesPlayed,
    loserGamesPlayed,
  );

  await prisma.$transaction(async (tx) => {
    // Upsert winner rating snapshot
    await tx.playerRating.upsert({
      where: {
        playerProfileId_ratingCategoryId: {
          playerProfileId: winnerProfileId,
          ratingCategoryId,
        },
      },
      update: { rating: winner.newRating, gamesPlayed: { increment: 1 } },
      create: {
        playerProfileId: winnerProfileId,
        ratingCategoryId,
        rating: winner.newRating,
        gamesPlayed: 1,
      },
    });

    // Upsert loser rating snapshot
    await tx.playerRating.upsert({
      where: {
        playerProfileId_ratingCategoryId: {
          playerProfileId: loserProfileId,
          ratingCategoryId,
        },
      },
      update: { rating: loser.newRating, gamesPlayed: { increment: 1 } },
      create: {
        playerProfileId: loserProfileId,
        ratingCategoryId,
        rating: loser.newRating,
        gamesPlayed: 1,
      },
    });

    // Insert winner transaction (immutable ledger)
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

    // Insert loser transaction (immutable ledger)
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
