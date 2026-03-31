import { describe, it, expect } from "vitest";
import { computeAdvancers } from "@/server/algorithms/advancer";
import type { GroupedRoundRobinStandings } from "@/server/services/bracket.service";

// Helper: build a minimal standing entry
function s(
  playerProfileId: string,
  displayName: string,
  wins: number,
  rank: number,
  tied = false,
) {
  return { playerProfileId, displayName, wins, losses: 0, gamesWon: 0, gamesLost: 0, pointsFor: 0, pointsAgainst: 0, rank, tied };
}

// Helper: build a group
function g(groupNumber: number, standings: ReturnType<typeof s>[]): GroupedRoundRobinStandings {
  return { groupNumber, standings };
}

describe("computeAdvancers", () => {
  describe("1 advancer per group, 3 groups", () => {
    const groups = [
      g(1, [s("g1p1", "G1 P1", 2, 1), s("g1p2", "G1 P2", 1, 2), s("g1p3", "G1 P3", 0, 3)]),
      g(2, [s("g2p1", "G2 P1", 2, 1), s("g2p2", "G2 P2", 1, 2), s("g2p3", "G2 P3", 0, 3)]),
      g(3, [s("g3p1", "G3 P1", 2, 1), s("g3p2", "G3 P2", 1, 2), s("g3p3", "G3 P3", 0, 3)]),
    ];

    it("returns ok with 3 advancers", () => {
      const result = computeAdvancers(groups, 1, new Map());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.advancers).toHaveLength(3);
    });

    it("assigns seeds 1–3 in group order (rank 1 is odd → ascending)", () => {
      const result = computeAdvancers(groups, 1, new Map());
      if (!result.ok) throw new Error("expected ok");
      expect(result.advancers[0].playerProfileId).toBe("g1p1");
      expect(result.advancers[0].seSeed).toBe(1);
      expect(result.advancers[1].playerProfileId).toBe("g2p1");
      expect(result.advancers[1].seSeed).toBe(2);
      expect(result.advancers[2].playerProfileId).toBe("g3p1");
      expect(result.advancers[2].seSeed).toBe(3);
    });
  });

  describe("2 advancers per group, 4 groups — half-zone constrained seeding", () => {
    // 4 groups × 2 advancers = 8 players in SE bracket (B=8, no byes)
    // bracketSeedOrder(8) = [1,8,4,5,2,7,3,6]
    // Upper half seeds: {1,4,5,8}  Lower half seeds: {2,3,6,7}
    // Winners: G1W=1(upper), G2W=2(lower), G3W=3(lower), G4W=4(upper)
    // Runner-up pool seeds 5–8: upper={5,8}, lower={6,7}
    // Runners-up descending (G4→G1):
    //   G4R: G4W upper → needs lower → 6   G3R: G3W lower → needs upper → 5
    //   G2R: G2W lower → needs upper → 8   G1R: G1W upper → needs lower → 7
    const groups = [
      g(1, [
        s("g1p1", "G1 P1", 3, 1),
        s("g1p2", "G1 P2", 2, 2),
        s("g1p3", "G1 P3", 1, 3),
        s("g1p4", "G1 P4", 0, 4),
      ]),
      g(2, [
        s("g2p1", "G2 P1", 3, 1),
        s("g2p2", "G2 P2", 2, 2),
        s("g2p3", "G2 P3", 1, 3),
        s("g2p4", "G2 P4", 0, 4),
      ]),
      g(3, [
        s("g3p1", "G3 P1", 3, 1),
        s("g3p2", "G3 P2", 2, 2),
        s("g3p3", "G3 P3", 1, 3),
        s("g3p4", "G3 P4", 0, 4),
      ]),
      g(4, [
        s("g4p1", "G4 P1", 3, 1),
        s("g4p2", "G4 P2", 2, 2),
        s("g4p3", "G4 P3", 1, 3),
        s("g4p4", "G4 P4", 0, 4),
      ]),
    ];

    it("returns 8 advancers", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      expect(result.advancers).toHaveLength(8);
    });

    it("rank 1 seeds 1–4 in ascending group order", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const rank1 = result.advancers.filter((a) => a.groupRank === 1);
      expect(rank1.map((a) => a.playerProfileId)).toEqual(["g1p1", "g2p1", "g3p1", "g4p1"]);
      expect(rank1.map((a) => a.seSeed)).toEqual([1, 2, 3, 4]);
    });

    it("rank 2 seeds assigned via half-zone constraint, no same-group R1 pairing", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const advancers = result.advancers;

      // Verify seed assignments: G3R=5, G4R=6, G1R=7, G2R=8
      const byId = new Map(advancers.map((a) => [a.playerProfileId, a]));
      expect(byId.get("g3p2")!.seSeed).toBe(5);
      expect(byId.get("g4p2")!.seSeed).toBe(6);
      expect(byId.get("g1p2")!.seSeed).toBe(7);
      expect(byId.get("g2p2")!.seSeed).toBe(8);

      // Verify no R1 same-group pairings in bracketSeedOrder(8) = [1,8,4,5,2,7,3,6]
      // R1 pairs: (seed1,seed8), (seed4,seed5), (seed2,seed7), (seed3,seed6)
      const seedToGroup = new Map(advancers.map((a) => [a.seSeed, a.groupNumber]));
      const r1Pairs = [[1, 8], [4, 5], [2, 7], [3, 6]];
      for (const [s1, s2] of r1Pairs) {
        const g1 = seedToGroup.get(s1);
        const g2 = seedToGroup.get(s2);
        if (g1 !== undefined && g2 !== undefined) {
          expect(g1).not.toBe(g2);
        }
      }
    });
  });

  describe("tie detection", () => {
    it("returns { ok: false } when tied at the advancement boundary", () => {
      const groups = [
        g(1, [
          s("g1p1", "G1 P1", 2, 1),
          // rank 2 is tied between g1p2 and g1p3
          s("g1p2", "G1 P2", 1, 2, true),
          s("g1p3", "G1 P3", 1, 2, true),
        ]),
      ];
      const result = computeAdvancers(groups, 2, new Map());
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.tiedGroups).toHaveLength(1);
      expect(result.tiedGroups[0].groupNumber).toBe(1);
      expect(result.tiedGroups[0].rank).toBe(2);
      expect(result.tiedGroups[0].tiedPlayers).toHaveLength(2);
    });

    it("resolves tie when override is provided", () => {
      const groups = [
        g(1, [
          s("g1p1", "G1 P1", 2, 1),
          s("g1p2", "G1 P2", 1, 2, true),
          s("g1p3", "G1 P3", 1, 2, true),
        ]),
      ];
      const overrides = new Map<string, boolean>([
        ["g1p2", true],
        ["g1p3", false],
      ]);
      const result = computeAdvancers(groups, 2, overrides);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.advancers.map((a) => a.playerProfileId)).toContain("g1p2");
      expect(result.advancers.map((a) => a.playerProfileId)).not.toContain("g1p3");
    });

    it("does not flag a tie when advancement boundary players have distinct ranks", () => {
      const groups = [
        g(1, [
          s("g1p1", "G1 P1", 2, 1),
          s("g1p2", "G1 P2", 1, 2),
          s("g1p3", "G1 P3", 0, 3),
        ]),
      ];
      const result = computeAdvancers(groups, 2, new Map());
      expect(result.ok).toBe(true);
    });
  });
});
