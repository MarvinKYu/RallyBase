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
  it("3 players: top seed gets a bye at pos 1, bottom two at pos 2", () => {
    const { matches } = buildSingleEliminationBlueprint(["p1", "p2", "p3"]);
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    // bracketSeedOrder(4) = [1,4,2,3] → pos1:(seed1,seed4=bye), pos2:(seed2,seed3)
    expect(r1[0]).toMatchObject({ player1Id: "p1", player2Id: null });
    expect(r1[1]).toMatchObject({ player1Id: "p2", player2Id: "p3" });
  });

  it("6 players: seeds 1 and 2 both get byes on opposite halves", () => {
    const { matches } = buildSingleEliminationBlueprint(ids(6));
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    // bracketSeedOrder(8) = [1,8,4,5,2,7,3,6]
    // pos1:(seed1,seed8=bye), pos2:(seed4,seed5), pos3:(seed2,seed7=bye), pos4:(seed3,seed6)
    expect(r1[0]).toMatchObject({ position: 1, player1Id: "p1", player2Id: null });
    expect(r1[1]).toMatchObject({ position: 2, player1Id: "p4", player2Id: "p5" });
    expect(r1[2]).toMatchObject({ position: 3, player1Id: "p2", player2Id: null });
    expect(r1[3]).toMatchObject({ position: 4, player1Id: "p3", player2Id: "p6" });
  });

  it("total matches equals bracketSize−1 regardless of byes", () => {
    for (const n of [3, 5, 6, 7]) {
      const { bracketSize, matches } = buildSingleEliminationBlueprint(ids(n));
      expect(matches.length).toBe(bracketSize - 1);
    }
  });
});

describe("buildSingleEliminationBlueprint — seeding (correct bracket halves)", () => {
  it("8 players: pos1=(1v8), pos2=(4v5), pos3=(2v7), pos4=(3v6)", () => {
    const { matches } = buildSingleEliminationBlueprint(ids(8));
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    expect(r1[0]).toMatchObject({ position: 1, player1Id: "p1", player2Id: "p8" });
    expect(r1[1]).toMatchObject({ position: 2, player1Id: "p4", player2Id: "p5" });
    expect(r1[2]).toMatchObject({ position: 3, player1Id: "p2", player2Id: "p7" });
    expect(r1[3]).toMatchObject({ position: 4, player1Id: "p3", player2Id: "p6" });
  });

  it("seeds 1 and 2 always land on opposite halves for any power-of-2 size", () => {
    for (const n of [4, 8, 16, 32]) {
      const { matches, bracketSize } = buildSingleEliminationBlueprint(ids(n));
      const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
      const halfSize = bracketSize / 4; // R1 positions per half
      const seed1Pos = r1.find((m) => m.player1Id === "p1")!.position;
      const seed2Pos = r1.find((m) => m.player1Id === "p2")!.position;
      expect(seed1Pos <= halfSize).toBe(true);
      expect(seed2Pos > halfSize).toBe(true);
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
