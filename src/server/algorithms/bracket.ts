/**
 * Single-elimination bracket engine — pure functions, no side effects.
 *
 * Seeding uses the standard recursive bracket seeding algorithm so the top two
 * seeds always land on opposite halves and can only meet in the final.
 *
 * For bracketSize = 8: seed order by R1 position = [1v8], [4v5], [2v7], [3v6]
 * Top seeds receive a bye (player2 = null) when N is not a power of 2.
 */

export const MIN_PLAYERS = 2;

export interface MatchBlueprint {
  round: number;     // 1 = first round, totalRounds = final
  position: number;  // 1-indexed within the round
  player1Id: string | null;
  player2Id: string | null;
}

export interface BracketBlueprint {
  totalRounds: number;
  bracketSize: number;
  matches: MatchBlueprint[];
}

/**
 * Generates the seed numbers for each slot in R1 using the standard recursive
 * bracket seeding algorithm. Consecutive pairs are (player1, player2) for each
 * match position.
 *
 * bracketSeedOrder(2)  = [1, 2]
 * bracketSeedOrder(4)  = [1, 4, 2, 3]
 * bracketSeedOrder(8)  = [1, 8, 4, 5, 2, 7, 3, 6]
 * bracketSeedOrder(16) = [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
 */
function bracketSeedOrder(bracketSize: number): number[] {
  if (bracketSize === 2) return [1, 2];
  const half = bracketSeedOrder(bracketSize / 2);
  const result: number[] = [];
  for (const seed of half) {
    result.push(seed, bracketSize + 1 - seed);
  }
  return result;
}

/**
 * Returns the complete match structure for a single-elimination bracket.
 *
 * @param playerIds Sorted best→worst (index 0 = top seed / seed 1).
 */
export function buildSingleEliminationBlueprint(
  playerIds: string[],
): BracketBlueprint {
  const n = playerIds.length;
  if (n < MIN_PLAYERS) {
    throw new Error(`Need at least ${MIN_PLAYERS} players to generate a bracket`);
  }

  const totalRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, totalRounds);
  const seedOrder = bracketSeedOrder(bracketSize);
  const matches: MatchBlueprint[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);

    for (let position = 1; position <= matchesInRound; position++) {
      let player1Id: string | null = null;
      let player2Id: string | null = null;

      if (round === 1) {
        // seedOrder pairs are at indices [2*(position-1), 2*(position-1)+1]
        const p1Seed = seedOrder[2 * (position - 1)];
        const p2Seed = seedOrder[2 * (position - 1) + 1];
        player1Id = p1Seed <= n ? playerIds[p1Seed - 1] : null;
        player2Id = p2Seed <= n ? playerIds[p2Seed - 1] : null;
      }
      // Rounds > 1 start empty — players advance as matches complete.

      matches.push({ round, position, player1Id, player2Id });
    }
  }

  return { totalRounds, bracketSize, matches };
}

/**
 * Returns the (round, position) of the match that a winner feeds into.
 * Returns null for the final match.
 */
export function nextMatchCoords(
  round: number,
  position: number,
  totalRounds: number,
): { round: number; position: number } | null {
  if (round >= totalRounds) return null;
  return { round: round + 1, position: Math.ceil(position / 2) };
}

/**
 * Returns which slot the winner of a match fills in the next match.
 * Odd positions → player1, even positions → player2.
 */
export function winnerSlotInNextMatch(position: number): "player1Id" | "player2Id" {
  return position % 2 === 1 ? "player1Id" : "player2Id";
}
