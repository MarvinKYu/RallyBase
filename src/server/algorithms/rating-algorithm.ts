/**
 * Rating algorithm abstraction layer.
 *
 * Defines the RatingAlgorithm interface and a dispatcher that returns the correct
 * algorithm implementation for a given organization slug. All orgs currently use Elo.
 *
 * To plug in a custom RallyBase algorithm when it's ready:
 *   1. Implement RatingAlgorithm in a new file (e.g. rallybase-rating.ts)
 *   2. Import it here and add: if (orgSlug === "rallybase") return rallybaseAlgorithm;
 */

import { calculateMatchElo } from "@/server/algorithms/elo";

export interface RatingAlgorithmResult {
  winner: { newRating: number; delta: number };
  loser: { newRating: number; delta: number };
}

export interface RatingAlgorithm {
  calcMatchResult(params: {
    winnerRating: number;
    loserRating: number;
    winnerGamesPlayed: number;
    loserGamesPlayed: number;
  }): RatingAlgorithmResult;
}

const eloAlgorithm: RatingAlgorithm = {
  calcMatchResult: ({ winnerRating, loserRating, winnerGamesPlayed, loserGamesPlayed }) =>
    calculateMatchElo(winnerRating, loserRating, winnerGamesPlayed, loserGamesPlayed),
};

/**
 * Returns the rating algorithm for the given organization slug.
 * All orgs currently use Elo.
 */
export function getAlgorithmForOrg(_orgSlug: string): RatingAlgorithm {
  // TODO: when rallybase custom algorithm is complete, add:
  // if (_orgSlug === "rallybase") return rallybaseAlgorithm;
  return eloAlgorithm;
}
