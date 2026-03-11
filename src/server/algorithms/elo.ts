/**
 * Elo rating algorithm — pure functions, no side effects.
 *
 * K-factor tiers (standard competitive table tennis convention):
 *   < 30 games  → K = 32  (provisional, high volatility)
 *   < 100 games → K = 24  (established)
 *   ≥ 100 games → K = 16  (experienced, low volatility)
 */

export const DEFAULT_RATING = 1500;

export function getKFactor(gamesPlayed: number): number {
  if (gamesPlayed < 30) return 32;
  if (gamesPlayed < 100) return 24;
  return 16;
}

/** Probability that `playerRating` beats `opponentRating`. */
export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export interface EloResult {
  newRating: number;
  delta: number;
}

/**
 * Calculates a new Elo rating after one match outcome.
 *
 * @param playerRating   Current rating of the player being updated
 * @param opponentRating Current rating of their opponent
 * @param outcome        Whether the player won or lost
 * @param kFactor        K-factor to use (defaults to 32)
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  outcome: "win" | "loss",
  kFactor: number = 32,
): EloResult {
  const actual = outcome === "win" ? 1 : 0;
  const expected = expectedScore(playerRating, opponentRating);
  const delta = kFactor * (actual - expected);
  return {
    newRating: playerRating + delta,
    delta,
  };
}

export interface MatchEloResult {
  winner: EloResult;
  loser: EloResult;
}

/**
 * Calculates new ratings for both players in a completed match.
 * Each player gets their own K-factor based on their games played.
 */
export function calculateMatchElo(
  winnerRating: number,
  loserRating: number,
  winnerGamesPlayed: number,
  loserGamesPlayed: number,
): MatchEloResult {
  const winnerK = getKFactor(winnerGamesPlayed);
  const loserK = getKFactor(loserGamesPlayed);
  return {
    winner: calculateElo(winnerRating, loserRating, "win", winnerK),
    loser: calculateElo(loserRating, winnerRating, "loss", loserK),
  };
}
