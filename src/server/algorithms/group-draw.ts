/**
 * Group draw algorithm — pure functions, no side effects.
 *
 * Distributes players into round-robin groups using snake/serpentine seeding:
 * players are sorted by rating (best first), then assigned to groups in a
 * snake pattern so each group contains one player from each rating tier.
 *
 * Example — 6 players, groupSize 3 → 2 groups:
 *   Sorted: P1(1800), P2(1700), P3(1600), P4(1500), P5(1450), P6(1400)
 *   Round 1 →: G1←P1, G2←P2
 *   Round 2 ←: G2←P3, G1←P4
 *   Round 3 →: G1←P5, G2←P6
 *   Group 1: [P1, P4, P5]   Group 2: [P2, P3, P6]
 */

import { MIN_RR_PLAYERS, MAX_RR_PLAYERS } from "@/server/algorithms/round-robin";

/**
 * Assigns players to groups using snake seeding based on ratings.
 *
 * @param playerIds - Player profile IDs in any order
 * @param ratings   - Corresponding ratings (same index as playerIds)
 * @param groupSize - Target max players per group (3–6)
 * @returns Array of groups; each group is an array of playerProfileIds
 * @throws If groupSize is out of range or any group would be too small
 */
export function assignGroups(
  playerIds: string[],
  ratings: number[],
  groupSize: number,
): string[][] {
  if (groupSize < MIN_RR_PLAYERS || groupSize > MAX_RR_PLAYERS) {
    throw new Error(
      `Group size must be between ${MIN_RR_PLAYERS} and ${MAX_RR_PLAYERS} (got ${groupSize})`,
    );
  }

  const n = playerIds.length;
  const numGroups = Math.ceil(n / groupSize);

  // Validate that every group will have at least MIN_RR_PLAYERS
  const minGroupSize = Math.floor(n / numGroups);
  if (minGroupSize < MIN_RR_PLAYERS) {
    throw new Error(
      `Not enough players for ${numGroups} valid groups with group size ${groupSize}. ` +
        `Need at least ${numGroups * MIN_RR_PLAYERS} players (currently ${n}).`,
    );
  }

  // Sort players by rating descending (best first)
  const paired = playerIds.map((id, i) => ({ id, rating: ratings[i] ?? 1500 }));
  paired.sort((a, b) => b.rating - a.rating);

  // Initialise empty groups
  const groups: string[][] = Array.from({ length: numGroups }, () => []);

  // Snake distribution
  let direction = 1; // 1 = left-to-right, -1 = right-to-left
  let groupIndex = 0;

  for (const { id } of paired) {
    groups[groupIndex].push(id);

    // Advance to the next group index
    const next = groupIndex + direction;
    if (next >= numGroups) {
      // Hit right end — reverse direction, stay at last group
      direction = -1;
      groupIndex = numGroups - 1;
    } else if (next < 0) {
      // Hit left end — reverse direction, stay at first group
      direction = 1;
      groupIndex = 0;
    } else {
      groupIndex = next;
    }
  }

  return groups;
}
