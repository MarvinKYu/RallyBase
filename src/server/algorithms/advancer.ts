/**
 * Advancer computation for RR → SE hybrid events — pure functions, no side effects.
 *
 * Given per-group RR standings and a configured advancers-per-group count, produces
 * an ordered list of advancing players with their SE bracket seeds assigned via
 * ascending inter-group ordering for every rank:
 *
 *   Rank 1 seeds → groups in ascending order   (seeds 1 … numGroups)
 *   Rank 2 seeds → groups in ascending order   (seeds numGroups+1 … 2*numGroups)
 *   Rank 3 seeds → groups in ascending order   (seeds 2*numGroups+1 … 3*numGroups)
 *
 * Ascending ordering for all ranks ensures that, given the standard recursive
 * bracket seeding (bracketSeedOrder), no two players from the same group are
 * paired in the first round. E.g. for 4 groups × 2 advancers:
 *   seeds 1–4 = G1–G4 winners; seeds 5–8 = G1–G4 runners-up
 *   bracketSeedOrder(8) pairs: 1v8(G1W/G4R), 4v5(G4W/G1R), 2v7(G2W/G3R), 3v6(G3W/G2R)
 */

import type {
  GroupedRoundRobinStandings,
  RoundRobinStanding,
} from "@/server/services/bracket.service";

export interface Advancer {
  playerProfileId: string;
  displayName: string;
  groupNumber: number;
  groupRank: number; // 1 = group winner, 2 = runner-up, etc.
  seSeed: number;    // 1-indexed SE bracket seed
}

export interface TiedGroup {
  groupNumber: number;
  rank: number; // the contested advancement rank (e.g. 2 means tied for the last advancement spot)
  tiedPlayers: { playerProfileId: string; displayName: string }[];
}

export type AdvancerResult =
  | { ok: true; advancers: Advancer[] }
  | { ok: false; tiedGroups: TiedGroup[] };

/**
 * Computes which players advance from RR groups to the SE bracket.
 *
 * @param groupStandings   Per-group standings from getRoundRobinStandings(eventId, true)
 * @param advancersPerGroup Number of players that advance from each group
 * @param overrides        Manual tie-resolution overrides: playerProfileId → true (advance) | false (exclude)
 */
export function computeAdvancers(
  groupStandings: GroupedRoundRobinStandings[],
  advancersPerGroup: number,
  overrides: Map<string, boolean>,
): AdvancerResult {
  // Sort groups by group number for deterministic ordering
  const sorted = [...groupStandings].sort((a, b) => a.groupNumber - b.groupNumber);
  const numGroups = sorted.length;

  // For each group, determine which players advance (top advancersPerGroup)
  // keyed by rank within the group (1-indexed)
  const advancersByRank: Map<number, Array<{ groupNumber: number; standing: RoundRobinStanding }>> =
    new Map();
  const tiedGroups: TiedGroup[] = [];

  for (const { groupNumber, standings } of sorted) {
    // standings are already sorted by rank ascending
    const lastAdvancerRank = advancersPerGroup;
    const lastAdvancer = standings[lastAdvancerRank - 1];
    const firstNonAdvancer = standings[lastAdvancerRank];

    if (lastAdvancer && firstNonAdvancer) {
      // Check if the boundary rank is tied (last advancer and first non-advancer share same rank)
      if (lastAdvancer.rank === firstNonAdvancer.rank) {
        // Tied — check if overrides resolve it
        const tiedAtBoundary = standings.filter((s) => s.rank === lastAdvancer.rank);
        const neededFromTied = tiedAtBoundary.filter((_, i) => {
          const rankAbove = standings.filter((s) => s.rank < lastAdvancer.rank).length;
          return i < advancersPerGroup - rankAbove;
        });

        // Count how many from the tied group have an override
        const resolvedTrue = tiedAtBoundary.filter((s) => overrides.get(s.playerProfileId) === true);
        const resolvedFalse = tiedAtBoundary.filter((s) => overrides.get(s.playerProfileId) === false);
        const resolvedCount = resolvedTrue.length + resolvedFalse.length;
        const expectedTrue = neededFromTied.length;

        if (resolvedTrue.length === expectedTrue && resolvedFalse.length === tiedAtBoundary.length - expectedTrue) {
          // Fully resolved — use overrides
          const rankAboveTie = standings.filter((s) => s.rank < lastAdvancer.rank).length;
          for (let r = 1; r <= rankAboveTie; r++) {
            const s = standings[r - 1];
            if (!advancersByRank.has(r)) advancersByRank.set(r, []);
            advancersByRank.get(r)!.push({ groupNumber, standing: s });
          }
          // Add the override-selected players at the boundary rank
          let boundaryRank = rankAboveTie + 1;
          for (const s of resolvedTrue) {
            if (!advancersByRank.has(boundaryRank)) advancersByRank.set(boundaryRank, []);
            advancersByRank.get(boundaryRank)!.push({ groupNumber, standing: s });
            boundaryRank++;
          }
        } else {
          // Not resolved — record as a tied group
          tiedGroups.push({
            groupNumber,
            rank: lastAdvancer.rank,
            tiedPlayers: tiedAtBoundary.map((s) => ({
              playerProfileId: s.playerProfileId,
              displayName: s.displayName,
            })),
          });
        }
        continue;
      }
    }

    // No tie at the boundary — take top advancersPerGroup directly
    for (let r = 1; r <= advancersPerGroup; r++) {
      const s = standings[r - 1];
      if (!s) break;
      if (!advancersByRank.has(r)) advancersByRank.set(r, []);
      advancersByRank.get(r)!.push({ groupNumber, standing: s });
    }
  }

  if (tiedGroups.length > 0) {
    return { ok: false, tiedGroups };
  }

  // Assign SE seeds using ascending inter-group ordering for every rank
  const advancers: Advancer[] = [];
  let nextSeed = 1;

  for (let rank = 1; rank <= advancersPerGroup; rank++) {
    const groupsAtRank = advancersByRank.get(rank) ?? [];
    const ordered = groupsAtRank; // always ascending group order

    for (const { groupNumber, standing } of ordered) {
      advancers.push({
        playerProfileId: standing.playerProfileId,
        displayName: standing.displayName,
        groupNumber,
        groupRank: rank,
        seSeed: nextSeed++,
      });
    }
  }

  return { ok: true, advancers };
}
