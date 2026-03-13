/**
 * Round-robin bracket engine — pure functions, no side effects.
 *
 * Uses the "circle method" (polygon rotation) to generate a balanced schedule:
 * - Fix the first player, rotate the rest each round.
 * - For n players (even): n-1 rounds, n/2 matches per round.
 * - For n players (odd): n rounds, (n-1)/2 matches per round (one player gets a bye each round).
 *
 * Supports 3–6 players.
 */

export const MIN_RR_PLAYERS = 3;
export const MAX_RR_PLAYERS = 6;

export interface RoundRobinMatchBlueprint {
  round: number;
  position: number;
  player1Id: string;
  player2Id: string;
}

export interface RoundRobinBlueprint {
  rounds: number;
  matches: RoundRobinMatchBlueprint[];
}

/**
 * Generates a balanced round-robin schedule for the given player IDs.
 * Players play every other player exactly once.
 */
export function buildRoundRobinSchedule(playerIds: string[]): RoundRobinBlueprint {
  const n = playerIds.length;
  if (n < MIN_RR_PLAYERS || n > MAX_RR_PLAYERS) {
    throw new Error(`Round robin supports ${MIN_RR_PLAYERS}–${MAX_RR_PLAYERS} players`);
  }

  // Pad to even count — null represents a bye slot
  const players: (string | null)[] = [...playerIds];
  if (n % 2 !== 0) {
    players.push(null);
  }

  const size = players.length; // always even
  const totalRounds = size - 1;

  const fixed = players[0];
  const rotating = players.slice(1);

  const matches: RoundRobinMatchBlueprint[] = [];

  for (let round = 0; round < totalRounds; round++) {
    const circle: (string | null)[] = [fixed, ...rotating];
    let position = 1;

    for (let i = 0; i < size / 2; i++) {
      const p1 = circle[i];
      const p2 = circle[size - 1 - i];

      // Skip bye pairs (either slot is null)
      if (p1 !== null && p2 !== null) {
        matches.push({ round: round + 1, position, player1Id: p1, player2Id: p2 });
        position++;
      }
    }

    // Rotate: move last element of rotating to front
    rotating.unshift(rotating.pop()!);
  }

  return { rounds: totalRounds, matches };
}
