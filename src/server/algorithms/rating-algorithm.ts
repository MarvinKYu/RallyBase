import { calculateMatchElo } from "@/server/algorithms/elo";
import { rallybaseGlickoAlgorithm } from "@/server/algorithms/rallybase-glicko";

export interface RatingAlgorithmResult {
  winner: { newRating: number; delta: number; newRd?: number; newSigma?: number };
  loser: { newRating: number; delta: number; newRd?: number; newSigma?: number };
}

export interface RatingAlgorithm {
  defaultRating: number;
  calcMatchResult(params: {
    winnerRating: number;
    loserRating: number;
    winnerGamesPlayed: number;
    loserGamesPlayed: number;
    winnerRd?: number | null;
    loserRd?: number | null;
    winnerSigma?: number | null;
    loserSigma?: number | null;
    winnerLastActiveDay?: number | null;
    loserLastActiveDay?: number | null;
    winnerIsJunior?: boolean;
    loserIsJunior?: boolean;
    matchDay?: number;
  }): RatingAlgorithmResult;
}

const eloAlgorithm: RatingAlgorithm = {
  defaultRating: 1500,
  calcMatchResult: ({ winnerRating, loserRating, winnerGamesPlayed, loserGamesPlayed }) =>
    calculateMatchElo(winnerRating, loserRating, winnerGamesPlayed, loserGamesPlayed),
};

export function getAlgorithmForOrg(orgSlug: string): RatingAlgorithm {
  if (orgSlug === "rallybase") return rallybaseGlickoAlgorithm;
  return eloAlgorithm;
}
