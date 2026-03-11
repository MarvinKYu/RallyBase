/**
 * Single-elimination bracket engine — pure functions, no side effects.
 *
 * Seeding convention for R1 position p (1-indexed) in a bracket of bracketSize:
 *   player1 = seed p          (index p − 1)
 *   player2 = seed (bracketSize − p + 1)  (index bracketSize − p)
 *
 * Top seeds receive a bye (player2 = null) when N is not a power of 2.
 * Example for 6 players, bracketSize = 8:
 *   pos 1: seed 1 vs null (bye)
 *   pos 2: seed 2 vs null (bye)
 *   pos 3: seed 3 vs seed 6
 *   pos 4: seed 4 vs seed 5
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
  const matches: MatchBlueprint[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);

    for (let position = 1; position <= matchesInRound; position++) {
      let player1Id: string | null = null;
      let player2Id: string | null = null;

      if (round === 1) {
        const p1Index = position - 1;           // 0-indexed
        const p2Index = bracketSize - position; // 0-indexed (e.g., bracketSize=8, pos=1 → index 7)

        player1Id = p1Index < n ? playerIds[p1Index] : null;
        // Guard against the edge case where both indices point to the same slot
        player2Id = p2Index < n && p2Index !== p1Index ? playerIds[p2Index] : null;
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
