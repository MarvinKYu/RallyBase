import { describe, it, expect } from "vitest";
import {
  computeHeadToHead,
  compareTiebreakers,
  type MatchForTiebreaker,
} from "@/server/algorithms/round-robin-tiebreaker";

// Helpers
function match(
  player1Id: string,
  player2Id: string,
  winnerId: string,
  games: [number, number][],
): MatchForTiebreaker {
  return {
    player1Id,
    player2Id,
    winnerId,
    matchGames: games.map(([p1, p2]) => ({ player1Points: p1, player2Points: p2 })),
  };
}

describe("computeHeadToHead", () => {
  it("counts wins, games won, and points for each player", () => {
    // A beat B 3-1 (games): 11-7, 11-9, 8-11, 11-5
    const matches = [match("A", "B", "A", [[11, 7], [11, 9], [8, 11], [11, 5]])];
    const hh = computeHeadToHead(["A", "B"], matches);

    expect(hh.get("A")).toEqual({ gamesWon: 3, pointsFor: 41, wins: 1 });
    expect(hh.get("B")).toEqual({ gamesWon: 1, pointsFor: 32, wins: 0 });
  });

  it("only counts matches between players in the group", () => {
    // Match between A and C should be ignored (C not in group)
    const matches = [
      match("A", "B", "A", [[11, 5], [11, 7], [0, 0]]),
      match("A", "C", "C", [[7, 11], [5, 11], [0, 0]]), // outside group
    ];
    const hh = computeHeadToHead(["A", "B"], matches);

    expect(hh.get("A")!.wins).toBe(1);
    expect(hh.get("B")!.wins).toBe(0);
  });

  it("handles a 3-player group", () => {
    // A beat B, B beat C, C beat A (rock-paper-scissors)
    const matches = [
      match("A", "B", "A", [[11, 5], [11, 7], [0, 0]]),
      match("B", "C", "B", [[11, 3], [11, 6], [0, 0]]),
      match("A", "C", "C", [[5, 11], [7, 11], [0, 0]]),
    ];
    const hh = computeHeadToHead(["A", "B", "C"], matches);

    expect(hh.get("A")!.wins).toBe(1);
    expect(hh.get("B")!.wins).toBe(1);
    expect(hh.get("C")!.wins).toBe(1);
  });

  it("returns zero stats for players with no head-to-head matches played", () => {
    const hh = computeHeadToHead(["A", "B"], []);
    expect(hh.get("A")).toEqual({ gamesWon: 0, pointsFor: 0, wins: 0 });
    expect(hh.get("B")).toEqual({ gamesWon: 0, pointsFor: 0, wins: 0 });
  });
});

describe("compareTiebreakers", () => {
  it("breaks tie by games won first", () => {
    // A has 2 H2H games won, B has 1
    const hhMap = new Map([
      ["A", { gamesWon: 2, pointsFor: 30, wins: 1 }],
      ["B", { gamesWon: 1, pointsFor: 35, wins: 0 }],
    ]);
    expect(compareTiebreakers("A", "B", hhMap, 2)).toBeLessThan(0); // A ranks higher
  });

  it("breaks remaining tie by points for", () => {
    const hhMap = new Map([
      ["A", { gamesWon: 1, pointsFor: 25, wins: 1 }],
      ["B", { gamesWon: 1, pointsFor: 20, wins: 0 }],
    ]);
    expect(compareTiebreakers("A", "B", hhMap, 2)).toBeLessThan(0); // A ranks higher
  });

  it("breaks 2-player tie by direct H2H win", () => {
    const hhMap = new Map([
      ["A", { gamesWon: 1, pointsFor: 20, wins: 1 }],
      ["B", { gamesWon: 1, pointsFor: 20, wins: 0 }],
    ]);
    expect(compareTiebreakers("A", "B", hhMap, 2)).toBeLessThan(0); // A ranks higher (won H2H)
  });

  it("returns 0 for 3+ player group with equal tiebreakers (unresolvable)", () => {
    const hhMap = new Map([
      ["A", { gamesWon: 1, pointsFor: 20, wins: 1 }],
      ["B", { gamesWon: 1, pointsFor: 20, wins: 1 }],
    ]);
    expect(compareTiebreakers("A", "B", hhMap, 3)).toBe(0);
  });

  it("returns 0 when all tiebreakers are equal for 2 players", () => {
    const hhMap = new Map([
      ["A", { gamesWon: 1, pointsFor: 20, wins: 1 }],
      ["B", { gamesWon: 1, pointsFor: 20, wins: 1 }],
    ]);
    // Both won the H2H? Shouldn't happen in practice but tests the zero case
    expect(compareTiebreakers("A", "B", hhMap, 2)).toBe(0);
  });
});
