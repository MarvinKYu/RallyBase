import { describe, it, expect } from "vitest";
import {
  buildSingleEliminationBlueprint,
  nextMatchCoords,
  winnerSlotInNextMatch,
  MIN_PLAYERS,
} from "@/server/algorithms/bracket";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe("buildSingleEliminationBlueprint — structure", () => {
  it("throws for fewer than MIN_PLAYERS", () => {
    expect(() => buildSingleEliminationBlueprint([])).toThrow();
    expect(() => buildSingleEliminationBlueprint(["p1"])).toThrow();
  });

  it("creates exactly n−1 matches for a power-of-2 bracket", () => {
    for (const n of [2, 4, 8, 16]) {
      const { matches } = buildSingleEliminationBlueprint(ids(n));
      expect(matches.length).toBe(n - 1);
    }
  });

  it("totalRounds is ceil(log2(n))", () => {
    expect(buildSingleEliminationBlueprint(ids(2)).totalRounds).toBe(1);
    expect(buildSingleEliminationBlueprint(ids(3)).totalRounds).toBe(2);
    expect(buildSingleEliminationBlueprint(ids(4)).totalRounds).toBe(2);
    expect(buildSingleEliminationBlueprint(ids(5)).totalRounds).toBe(3);
    expect(buildSingleEliminationBlueprint(ids(8)).totalRounds).toBe(3);
  });

  it("final is the only match in the last round", () => {
    const { totalRounds, matches } = buildSingleEliminationBlueprint(ids(8));
    const finalMatches = matches.filter((m) => m.round === totalRounds);
    expect(finalMatches).toHaveLength(1);
    expect(finalMatches[0].position).toBe(1);
  });

  it("round 1 has bracketSize/2 matches", () => {
    const { bracketSize, matches } = buildSingleEliminationBlueprint(ids(8));
    const r1 = matches.filter((m) => m.round === 1);
    expect(r1).toHaveLength(bracketSize / 2);
  });

  it("each match has a unique (round, position) pair", () => {
    const { matches } = buildSingleEliminationBlueprint(ids(8));
    const keys = matches.map((m) => `${m.round}-${m.position}`);
    expect(new Set(keys).size).toBe(matches.length);
  });
});

describe("buildSingleEliminationBlueprint — seeding (power of 2)", () => {
  it("4-player bracket: R1 pairs seed1vsseed4 and seed2vsseed3", () => {
    const { matches } = buildSingleEliminationBlueprint(["p1", "p2", "p3", "p4"]);
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    expect(r1[0]).toMatchObject({ player1Id: "p1", player2Id: "p4" });
    expect(r1[1]).toMatchObject({ player1Id: "p2", player2Id: "p3" });
  });

  it("2-player bracket: single R1/final match with both players", () => {
    const { matches } = buildSingleEliminationBlueprint(["p1", "p2"]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ round: 1, player1Id: "p1", player2Id: "p2" });
  });

  it("rounds > 1 have null players (TBD)", () => {
    const { matches } = buildSingleEliminationBlueprint(ids(4));
    const r2 = matches.filter((m) => m.round === 2);
    expect(r2.every((m) => m.player1Id === null && m.player2Id === null)).toBe(true);
  });
});

describe("buildSingleEliminationBlueprint — byes (non-power of 2)", () => {
  it("3 players: top seed gets a bye", () => {
    const { matches } = buildSingleEliminationBlueprint(["p1", "p2", "p3"]);
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    // pos 1: p1 (bye), pos 2: p2 vs p3
    expect(r1[0]).toMatchObject({ player1Id: "p1", player2Id: null });
    expect(r1[1]).toMatchObject({ player1Id: "p2", player2Id: "p3" });
  });

  it("6 players: top 2 seeds get byes", () => {
    const { matches } = buildSingleEliminationBlueprint(ids(6));
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    expect(r1[0]).toMatchObject({ player1Id: "p1", player2Id: null });
    expect(r1[1]).toMatchObject({ player1Id: "p2", player2Id: null });
    expect(r1[2]).toMatchObject({ player1Id: "p3", player2Id: "p6" });
    expect(r1[3]).toMatchObject({ player1Id: "p4", player2Id: "p5" });
  });

  it("total matches equals bracketSize−1 regardless of byes", () => {
    for (const n of [3, 5, 6, 7]) {
      const { bracketSize, matches } = buildSingleEliminationBlueprint(ids(n));
      expect(matches.length).toBe(bracketSize - 1);
    }
  });
});

describe("nextMatchCoords", () => {
  it("returns null for the final round", () => {
    expect(nextMatchCoords(3, 1, 3)).toBeNull();
  });

  it("odd position → ceil(p/2) in next round", () => {
    expect(nextMatchCoords(1, 1, 3)).toEqual({ round: 2, position: 1 });
    expect(nextMatchCoords(1, 3, 3)).toEqual({ round: 2, position: 2 });
  });

  it("even position → same slot as the odd below it", () => {
    expect(nextMatchCoords(1, 2, 3)).toEqual({ round: 2, position: 1 });
    expect(nextMatchCoords(1, 4, 3)).toEqual({ round: 2, position: 2 });
  });
});

describe("winnerSlotInNextMatch", () => {
  it("odd positions → player1Id", () => {
    expect(winnerSlotInNextMatch(1)).toBe("player1Id");
    expect(winnerSlotInNextMatch(3)).toBe("player1Id");
  });

  it("even positions → player2Id", () => {
    expect(winnerSlotInNextMatch(2)).toBe("player2Id");
    expect(winnerSlotInNextMatch(4)).toBe("player2Id");
  });
});
