/**
 * Advancer computation for RR → SE hybrid events — pure functions, no side effects.
 *
 * Given per-group RR standings and a configured advancers-per-group count, produces
 * an ordered list of advancing players with their SE bracket seeds assigned using
 * constrained bracket-half placement:
 *
 * A = 1: group winners assigned seeds 1..G in ascending group order.
 *
 * A = 2: winners assigned seeds 1..G in ascending group order.
 *        Runners-up assigned seeds G+1..2G using a greedy half-zone algorithm:
 *          - Each runner-up is placed in the bracket half opposite their group's winner,
 *            guaranteeing no two players from the same group can meet before the final.
 *          - Runners-up are processed in descending group order, approximating the
 *            snake-seeding strength order (G_n runner-up is typically stronger than G_1).
 *          - Within each half, the strongest available seed is assigned first.
 *
 * A >= 3: not yet supported.
 */

import type {
  GroupedRoundRobinStandings,
  RoundRobinStanding,
} from "@/server/services/bracket.service";
import { bracketSeedOrder } from "@/server/algorithms/bracket";

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

/** Returns the smallest power of 2 that is >= n. */
function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Maps each seed number (1..bracketSize) to the bracket half it occupies.
 * Upper half = positions 0..bracketSize/2-1 in bracketSeedOrder output.
 * Lower half = positions bracketSize/2..bracketSize-1.
 */
function buildHalfMap(bracketSize: number): Map<number, "upper" | "lower"> {
  const order = bracketSeedOrder(bracketSize);
  const halfSize = bracketSize / 2;
  const map = new Map<number, "upper" | "lower">();
  for (let i = 0; i < order.length; i++) {
    map.set(order[i], i < halfSize ? "upper" : "lower");
  }
  return map;
}

/**
 * Computes which players advance from RR groups to the SE bracket.
 *
 * @param groupStandings   Per-group standings from getRoundRobinStandings(eventId, true)
 * @param advancersPerGroup Number of players that advance from each group (1 or 2)
 * @param overrides        Manual tie-resolution overrides: playerProfileId → true (advance) | false (exclude)
 */
export function computeAdvancers(
  groupStandings: GroupedRoundRobinStandings[],
  advancersPerGroup: number,
  overrides: Map<string, boolean>,
): AdvancerResult {
  if (advancersPerGroup > 2) {
    throw new Error(
      `advancersPerGroup > 2 is not yet supported (got ${advancersPerGroup})`,
    );
  }

  // Sort groups by group number for deterministic ordering
  const sorted = [...groupStandings].sort((a, b) => a.groupNumber - b.groupNumber);

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

        if (resolvedTrue.length === neededFromTied.length && resolvedFalse.length === tiedAtBoundary.length - neededFromTied.length) {
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

  // Assign SE seeds
  const advancers: Advancer[] = [];
  const groupsAtRank1 = advancersByRank.get(1) ?? [];

  if (advancersPerGroup === 1) {
    // A=1: one winner per group, ascending group order, no same-group constraint needed
    let seed = 1;
    for (const { groupNumber, standing } of groupsAtRank1) {
      advancers.push({
        playerProfileId: standing.playerProfileId,
        displayName: standing.displayName,
        groupNumber,
        groupRank: 1,
        seSeed: seed++,
      });
    }
  } else {
    // A=2: constrained half-zone assignment
    //
    // Winners take seeds 1..G (ascending group order). Runners-up take seeds G+1..2G,
    // each assigned to the bracket half opposite their group's winner. This ensures no
    // two same-group players can be paired before the final.
    //
    // Runners-up are processed in descending group order (Gn first) to give stronger
    // runner-up seeds to the groups whose runners-up are typically stronger under
    // snake seeding.
    const numGroups = sorted.length;
    const N = numGroups * 2;
    const B = nextPowerOf2(N);
    const halfMap = buildHalfMap(B);

    // Place winners: ascending group order → seeds 1..numGroups
    const winnerHalfByGroup = new Map<number, "upper" | "lower">();
    let winnerSeed = 1;
    for (const { groupNumber, standing } of groupsAtRank1) {
      const half = halfMap.get(winnerSeed)!;
      winnerHalfByGroup.set(groupNumber, half);
      advancers.push({
        playerProfileId: standing.playerProfileId,
        displayName: standing.displayName,
        groupNumber,
        groupRank: 1,
        seSeed: winnerSeed++,
      });
    }

    // Partition runner-up seed pool (seeds G+1..2G) by half, strongest first within each
    const upperSeeds: number[] = [];
    const lowerSeeds: number[] = [];
    for (let seed = numGroups + 1; seed <= N; seed++) {
      if (halfMap.get(seed) === "upper") upperSeeds.push(seed);
      else lowerSeeds.push(seed);
    }

    // Place runners-up: descending group order (Gn → G1)
    const groupsAtRank2 = advancersByRank.get(2) ?? [];
    const rank2Descending = [...groupsAtRank2].reverse();

    for (const { groupNumber, standing } of rank2Descending) {
      const winnerHalf = winnerHalfByGroup.get(groupNumber)!;
      const requiredHalf = winnerHalf === "upper" ? "lower" : "upper";
      const pool = requiredHalf === "upper" ? upperSeeds : lowerSeeds;
      const assignedSeed = pool.shift()!;
      advancers.push({
        playerProfileId: standing.playerProfileId,
        displayName: standing.displayName,
        groupNumber,
        groupRank: 2,
        seSeed: assignedSeed,
      });
    }
  }

  return { ok: true, advancers };
}
