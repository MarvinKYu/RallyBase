/**
 * Round-robin tiebreaker computation — pure functions, no side effects.
 *
 * Tiebreaker priority (applied only among players tied on win count):
 *   1. Games/sets won in head-to-head matches among tied players
 *   2. Points scored in those head-to-head matches
 *   3. Direct head-to-head result (only when exactly 2 players remain tied)
 *
 * If players are still tied after all tiebreakers, they share a rank.
 */

export interface MatchForTiebreaker {
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  matchGames: { player1Points: number; player2Points: number }[];
}

export interface HeadToHeadStats {
  gamesWon: number;
  pointsFor: number;
  wins: number;
}

/**
 * Computes head-to-head stats for each player in a tied group.
 * Only matches between players within the group are counted.
 */
export function computeHeadToHead(
  playerIds: string[],
  matches: MatchForTiebreaker[],
): Map<string, HeadToHeadStats> {
  const playerSet = new Set(playerIds);
  const relevant = matches.filter(
    (m) =>
      m.player1Id !== null &&
      m.player2Id !== null &&
      playerSet.has(m.player1Id) &&
      playerSet.has(m.player2Id),
  );

  const map = new Map<string, HeadToHeadStats>();
  for (const p of playerIds) {
    map.set(p, { gamesWon: 0, pointsFor: 0, wins: 0 });
  }

  for (const match of relevant) {
    const p1 = map.get(match.player1Id!);
    const p2 = map.get(match.player2Id!);

    if (p1) {
      if (match.winnerId === match.player1Id) p1.wins++;
      for (const g of match.matchGames) {
        if (g.player1Points > g.player2Points) p1.gamesWon++;
        p1.pointsFor += g.player1Points;
      }
    }

    if (p2) {
      if (match.winnerId === match.player2Id) p2.wins++;
      for (const g of match.matchGames) {
        if (g.player2Points > g.player1Points) p2.gamesWon++;
        p2.pointsFor += g.player2Points;
      }
    }
  }

  return map;
}

/**
 * Compares two players within a tied group using head-to-head tiebreakers.
 * Returns negative if a ranks higher, positive if b ranks higher, 0 if still tied.
 */
export function compareTiebreakers(
  aId: string,
  bId: string,
  hhMap: Map<string, HeadToHeadStats>,
  groupSize: number,
): number {
  const ha = hhMap.get(aId)!;
  const hb = hhMap.get(bId)!;

  if (hb.gamesWon !== ha.gamesWon) return hb.gamesWon - ha.gamesWon;
  if (hb.pointsFor !== ha.pointsFor) return hb.pointsFor - ha.pointsFor;
  if (groupSize === 2) return hb.wins - ha.wins;
  return 0;
}
