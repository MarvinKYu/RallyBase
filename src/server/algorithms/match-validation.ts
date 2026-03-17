/**
 * Match result validation — pure functions, no side effects.
 *
 * Game rules:
 *   - A game is won by the first player to reach `pointTarget` AND lead by ≥ 2.
 *   - Scores of 0–0 mean the game was not played.
 *
 * Match rules:
 *   - BEST_OF_3  → first to 2 game wins
 *   - BEST_OF_5  → first to 3 game wins
 *   - BEST_OF_7  → first to 4 game wins
 *
 * Validation enforces:
 *   - Every game up to match-end has valid scores.
 *   - No games are played after the match is decided.
 *   - No gaps (0–0 games) before the match is decided.
 */

export const WINS_NEEDED: Record<string, number> = {
  BEST_OF_3: 2,
  BEST_OF_5: 3,
  BEST_OF_7: 4,
};

export const MAX_GAMES: Record<string, number> = {
  BEST_OF_3: 3,
  BEST_OF_5: 5,
  BEST_OF_7: 7,
};

export interface GameScore {
  player1Points: number;
  player2Points: number;
}

export type GameResult = "p1" | "p2" | "unplayed" | "invalid";

export type MatchValidationResult =
  | {
      valid: true;
      p1Wins: number;
      p2Wins: number;
      winner: "player1" | "player2";
      gamesPlayed: number;
    }
  | { valid: false; error: string };

/**
 * Determines the outcome of a single game.
 * Returns 'unplayed' if both scores are 0 (not played).
 */
export function validateGameScore(
  p1: number,
  p2: number,
  pointTarget: number,
): GameResult {
  if (p1 === 0 && p2 === 0) return "unplayed";
  const winner = Math.max(p1, p2);
  const loser = Math.min(p1, p2);
  const diff = winner - loser;
  if (winner < pointTarget) return "invalid";
  if (diff < 2) return "invalid";
  // If the game went past pointTarget (deuce), the margin must be exactly 2
  if (winner > pointTarget && diff !== 2) return "invalid";
  return p1 > p2 ? "p1" : "p2";
}

/**
 * Validates a full set of game scores against format and point target.
 *
 * @param games       Array of game scores (length = maxGames for the format).
 * @param format      'BEST_OF_3' | 'BEST_OF_5' | 'BEST_OF_7'
 * @param pointTarget Points needed to win a game (11 or 21).
 */
export function validateMatchSubmission(
  games: GameScore[],
  format: string,
  pointTarget: number,
): MatchValidationResult {
  const needed = WINS_NEEDED[format];
  if (!needed) return { valid: false, error: `Unknown match format: ${format}` };

  let p1Wins = 0;
  let p2Wins = 0;
  let matchDecidedAt = -1;

  for (let i = 0; i < games.length; i++) {
    const { player1Points: p1, player2Points: p2 } = games[i];
    const result = validateGameScore(p1, p2, pointTarget);

    // After the match is decided, remaining games must be unplayed
    if (matchDecidedAt >= 0) {
      if (result !== "unplayed") {
        return {
          valid: false,
          error: `Game ${i + 1} was played after the match was already decided`,
        };
      }
      continue;
    }

    // Before the match is decided, no gaps allowed
    if (result === "unplayed") {
      return {
        valid: false,
        error: `Game ${i + 1} score is missing — the match is not decided yet`,
      };
    }

    if (result === "invalid") {
      return {
        valid: false,
        error: `Game ${i + 1} has an invalid score (${p1}–${p2})`,
      };
    }

    if (result === "p1") p1Wins++;
    if (result === "p2") p2Wins++;

    if (p1Wins === needed || p2Wins === needed) {
      matchDecidedAt = i;
    }
  }

  if (matchDecidedAt < 0) {
    return { valid: false, error: "No winner could be determined from the submitted scores" };
  }

  return {
    valid: true,
    p1Wins,
    p2Wins,
    winner: p1Wins > p2Wins ? "player1" : "player2",
    gamesPlayed: matchDecidedAt + 1,
  };
}
