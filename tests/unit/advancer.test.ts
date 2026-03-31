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

  describe("2 advancers per group, 3 groups — half-zone constrained seeding", () => {
    // 3 groups × 2 advancers = 6 players in SE bracket (B=8, 2 byes)
    // Snake seeding: GroupA={orig1,orig6}, GroupB={orig2,orig5}, GroupC={orig3,orig4}
    // bracketSeedOrder(8) = [1,8,4,5,2,7,3,6]
    // Upper half seeds: {1,4,5,8}  Lower half seeds: {2,3,6,7}
    // Winners: G1W=seed1(upper), G2W=seed2(lower), G3W=seed3(lower)
    // Runner-up pool seeds 4–6: upper={4,5}, lower={6}
    // Runners-up descending (G3→G1):
    //   G3R: G3W lower → needs upper → 4
    //   G2R: G2W lower → needs upper → 5
    //   G1R: G1W upper → needs lower → 6
    // Byes at seeds 7, 8
    // R1 pairs: 1(G1W) vs 8(bye), 4(G3R) vs 5(G2R), 2(G2W) vs 7(bye), 3(G3W) vs 6(G1R)
    const groups = [
      g(1, [
        s("g1w", "G1 Winner", 2, 1),
        s("g1r", "G1 Runner-up", 1, 2),
        s("g1e", "G1 Eliminated", 0, 3),
      ]),
      g(2, [
        s("g2w", "G2 Winner", 2, 1),
        s("g2r", "G2 Runner-up", 1, 2),
        s("g2e", "G2 Eliminated", 0, 3),
      ]),
      g(3, [
        s("g3w", "G3 Winner", 2, 1),
        s("g3r", "G3 Runner-up", 1, 2),
        s("g3e", "G3 Eliminated", 0, 3),
      ]),
    ];

    it("returns 6 advancers", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      expect(result.advancers).toHaveLength(6);
    });

    it("winners assigned seeds 1–3 in ascending group order", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      expect(byId.get("g1w")!.seSeed).toBe(1);
      expect(byId.get("g2w")!.seSeed).toBe(2);
      expect(byId.get("g3w")!.seSeed).toBe(3);
    });

    it("runners-up assigned via half-zone: G3R=4, G2R=5, G1R=6", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      expect(byId.get("g3r")!.seSeed).toBe(4);
      expect(byId.get("g2r")!.seSeed).toBe(5);
      expect(byId.get("g1r")!.seSeed).toBe(6);
    });

    it("no same-group R1 pairings (byes at seeds 7 and 8)", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      // R1 pairs from bracketSeedOrder(8): (1,8), (4,5), (2,7), (3,6)
      // Seeds 7 and 8 are byes so only real-vs-real pairs to check: (4,5) and (3,6)
      const seedToGroup = new Map(result.advancers.map((a) => [a.seSeed, a.groupNumber]));
      expect(seedToGroup.get(4)).not.toBe(seedToGroup.get(5)); // G3R vs G2R
      expect(seedToGroup.get(3)).not.toBe(seedToGroup.get(6)); // G3W vs G1R
    });
  });

  describe("2 advancers per group, 6 groups — half-zone constrained seeding", () => {
    // 6 groups × 2 advancers = 12 players in SE bracket (B=16, 4 byes)
    // Snake seeding: A={1,12}, B={2,11}, C={3,10}, D={4,9}, E={5,8}, F={6,7}
    // bracketSeedOrder(16) = [1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11]
    // Upper half seeds: {1,4,5,8,9,12,13,16}  Lower half seeds: {2,3,6,7,10,11,14,15}
    // Winners: G1W=1(up), G2W=2(lo), G3W=3(lo), G4W=4(up), G5W=5(up), G6W=6(lo)
    // Runner-up pool seeds 7–12: upper={8,9,12}, lower={7,10,11}
    // Runners-up descending (G6→G1):
    //   G6R: G6W lo → needs up → 8    G5R: G5W up → needs lo → 7
    //   G4R: G4W up → needs lo → 10   G3R: G3W lo → needs up → 9
    //   G2R: G2W lo → needs up → 12   G1R: G1W up → needs lo → 11
    // Byes at seeds 13, 14, 15, 16
    // R1 pairs: (1,16)=G1W/bye, (8,9)=G6R/G3R, (4,13)=G4W/bye, (5,12)=G5W/G2R,
    //           (2,15)=G2W/bye, (7,10)=G5R/G4R, (3,14)=G3W/bye, (6,11)=G6W/G1R
    const groups = [
      g(1, [s("g1w", "G1 Win", 2, 1), s("g1r", "G1 Run", 1, 2), s("g1e", "G1 El", 0, 3)]),
      g(2, [s("g2w", "G2 Win", 2, 1), s("g2r", "G2 Run", 1, 2), s("g2e", "G2 El", 0, 3)]),
      g(3, [s("g3w", "G3 Win", 2, 1), s("g3r", "G3 Run", 1, 2), s("g3e", "G3 El", 0, 3)]),
      g(4, [s("g4w", "G4 Win", 2, 1), s("g4r", "G4 Run", 1, 2), s("g4e", "G4 El", 0, 3)]),
      g(5, [s("g5w", "G5 Win", 2, 1), s("g5r", "G5 Run", 1, 2), s("g5e", "G5 El", 0, 3)]),
      g(6, [s("g6w", "G6 Win", 2, 1), s("g6r", "G6 Run", 1, 2), s("g6e", "G6 El", 0, 3)]),
    ];

    it("returns 12 advancers", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      expect(result.advancers).toHaveLength(12);
    });

    it("winners assigned seeds 1–6 in ascending group order", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      expect(byId.get("g1w")!.seSeed).toBe(1);
      expect(byId.get("g2w")!.seSeed).toBe(2);
      expect(byId.get("g3w")!.seSeed).toBe(3);
      expect(byId.get("g4w")!.seSeed).toBe(4);
      expect(byId.get("g5w")!.seSeed).toBe(5);
      expect(byId.get("g6w")!.seSeed).toBe(6);
    });

    it("runners-up assigned via half-zone: G6R=8, G5R=7, G4R=10, G3R=9, G2R=12, G1R=11", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      expect(byId.get("g6r")!.seSeed).toBe(8);
      expect(byId.get("g5r")!.seSeed).toBe(7);
      expect(byId.get("g4r")!.seSeed).toBe(10);
      expect(byId.get("g3r")!.seSeed).toBe(9);
      expect(byId.get("g2r")!.seSeed).toBe(12);
      expect(byId.get("g1r")!.seSeed).toBe(11);
    });

    it("no same-group R1 pairings", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      // R1 pairs from bracketSeedOrder(16) where both seeds have real players:
      // (8,9)=G6R/G3R, (5,12)=G5W/G2R, (7,10)=G5R/G4R, (6,11)=G6W/G1R
      const seedToGroup = new Map(result.advancers.map((a) => [a.seSeed, a.groupNumber]));
      const realPairs = [[8, 9], [5, 12], [7, 10], [6, 11]];
      for (const [s1, s2] of realPairs) {
        expect(seedToGroup.get(s1)).not.toBe(seedToGroup.get(s2));
      }
    });
  });

  describe("2 advancers per group, 8 groups — half-zone constrained seeding", () => {
    // 8 groups × 2 advancers = 16 players in SE bracket (B=16, no byes)
    // Snake seeding: A={1,16}, B={2,15}, C={3,14}, D={4,13}, E={5,12}, F={6,11}, G={7,10}, H={8,9}
    // bracketSeedOrder(16) = [1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11]
    // Upper half seeds: {1,4,5,8,9,12,13,16}  Lower half seeds: {2,3,6,7,10,11,14,15}
    // Winners: G1W=1(up), G2W=2(lo), G3W=3(lo), G4W=4(up), G5W=5(up), G6W=6(lo), G7W=7(lo), G8W=8(up)
    // Runner-up pool seeds 9–16: upper={9,12,13,16}, lower={10,11,14,15}
    // Runners-up descending (G8→G1):
    //   G8R: G8W up → lo → 10    G7R: G7W lo → up → 9
    //   G6R: G6W lo → up → 12    G5R: G5W up → lo → 11
    //   G4R: G4W up → lo → 14    G3R: G3W lo → up → 13
    //   G2R: G2W lo → up → 16    G1R: G1W up → lo → 15
    // R1 pairs (no byes): (1,16)=G1W/G2R, (8,9)=G8W/G7R, (4,13)=G4W/G3R, (5,12)=G5W/G6R,
    //                     (2,15)=G2W/G1R, (7,10)=G7W/G8R, (3,14)=G3W/G4R, (6,11)=G6W/G5R
    const groups = [
      g(1, [s("g1w", "G1 Win", 1, 1), s("g1r", "G1 Run", 0, 2)]),
      g(2, [s("g2w", "G2 Win", 1, 1), s("g2r", "G2 Run", 0, 2)]),
      g(3, [s("g3w", "G3 Win", 1, 1), s("g3r", "G3 Run", 0, 2)]),
      g(4, [s("g4w", "G4 Win", 1, 1), s("g4r", "G4 Run", 0, 2)]),
      g(5, [s("g5w", "G5 Win", 1, 1), s("g5r", "G5 Run", 0, 2)]),
      g(6, [s("g6w", "G6 Win", 1, 1), s("g6r", "G6 Run", 0, 2)]),
      g(7, [s("g7w", "G7 Win", 1, 1), s("g7r", "G7 Run", 0, 2)]),
      g(8, [s("g8w", "G8 Win", 1, 1), s("g8r", "G8 Run", 0, 2)]),
    ];

    it("returns 16 advancers", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      expect(result.advancers).toHaveLength(16);
    });

    it("winners assigned seeds 1–8 in ascending group order", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      for (let i = 1; i <= 8; i++) {
        expect(byId.get(`g${i}w`)!.seSeed).toBe(i);
      }
    });

    it("runners-up assigned via half-zone: G7R=9, G8R=10, G5R=11, G6R=12, G3R=13, G4R=14, G1R=15, G2R=16", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      expect(byId.get("g7r")!.seSeed).toBe(9);
      expect(byId.get("g8r")!.seSeed).toBe(10);
      expect(byId.get("g5r")!.seSeed).toBe(11);
      expect(byId.get("g6r")!.seSeed).toBe(12);
      expect(byId.get("g3r")!.seSeed).toBe(13);
      expect(byId.get("g4r")!.seSeed).toBe(14);
      expect(byId.get("g1r")!.seSeed).toBe(15);
      expect(byId.get("g2r")!.seSeed).toBe(16);
    });

    it("no same-group R1 pairings (all 8 matches are real)", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      // All R1 pairs from bracketSeedOrder(16)
      const seedToGroup = new Map(result.advancers.map((a) => [a.seSeed, a.groupNumber]));
      const r1Pairs = [[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]];
      for (const [s1, s2] of r1Pairs) {
        expect(seedToGroup.get(s1)).not.toBe(seedToGroup.get(s2));
      }
    });
  });

  describe("2 advancers per group, 12 groups — half-zone constrained seeding", () => {
    // 12 groups × 2 advancers = 24 players in SE bracket (B=32, 8 byes)
    // Snake seeding: A={1,24}, B={2,23}, C={3,22}, D={4,21}, E={5,20}, F={6,19},
    //               G={7,18}, H={8,17}, I={9,16}, J={10,15}, K={11,14}, L={12,13}
    // bracketSeedOrder(32) = [1,32,16,17,8,25,9,24,4,29,13,20,5,28,12,21,
    //                          2,31,15,18,7,26,10,23,3,30,14,19,6,27,11,22]
    // Upper half seeds: {1,4,5,8,9,12,13,16,17,20,21,24,25,28,29,32}
    // Lower half seeds: {2,3,6,7,10,11,14,15,18,19,22,23,26,27,30,31}
    // Winners (seeds 1–12): G1(up) G2(lo) G3(lo) G4(up) G5(up) G6(lo)
    //                        G7(lo) G8(up) G9(up) G10(lo) G11(lo) G12(up)
    // Runner-up pool seeds 13–24: upper={13,16,17,20,21,24}, lower={14,15,18,19,22,23}
    // Runners-up descending (G12→G1):
    //   G12(up)→lo→14  G11(lo)→up→13  G10(lo)→up→16  G9(up)→lo→15
    //   G8(up)→lo→18   G7(lo)→up→17   G6(lo)→up→20   G5(up)→lo→19
    //   G4(up)→lo→22   G3(lo)→up→21   G2(lo)→up→24   G1(up)→lo→23
    // Byes at seeds 25–32
    // Real R1 pairs (both ≤24): (16,17),(9,24),(13,20),(12,21),(15,18),(10,23),(14,19),(11,22)
    const groups = Array.from({ length: 12 }, (_, i) =>
      g(i + 1, [
        s(`g${i + 1}w`, `G${i + 1} Win`, 2, 1),
        s(`g${i + 1}r`, `G${i + 1} Run`, 1, 2),
        s(`g${i + 1}e`, `G${i + 1} El`, 0, 3),
      ])
    );

    it("returns 24 advancers", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      expect(result.advancers).toHaveLength(24);
    });

    it("winners assigned seeds 1–12 in ascending group order", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      for (let i = 1; i <= 12; i++) {
        expect(byId.get(`g${i}w`)!.seSeed).toBe(i);
      }
    });

    it("runners-up assigned via half-zone constraint", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      // Descending group order: G12R=14, G11R=13, G10R=16, G9R=15,
      //                         G8R=18,  G7R=17,  G6R=20,  G5R=19,
      //                         G4R=22,  G3R=21,  G2R=24,  G1R=23
      const expected: [string, number][] = [
        ["g12r", 14], ["g11r", 13], ["g10r", 16], ["g9r", 15],
        ["g8r",  18], ["g7r",  17], ["g6r",  20], ["g5r",  19],
        ["g4r",  22], ["g3r",  21], ["g2r",  24], ["g1r",  23],
      ];
      for (const [id, seed] of expected) {
        expect(byId.get(id)!.seSeed).toBe(seed);
      }
    });

    it("no same-group R1 pairings", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const seedToGroup = new Map(result.advancers.map((a) => [a.seSeed, a.groupNumber]));
      // Real R1 pairs (both players ≤ seed 24)
      const realPairs = [[16,17],[9,24],[13,20],[12,21],[15,18],[10,23],[14,19],[11,22]];
      for (const [s1, s2] of realPairs) {
        expect(seedToGroup.get(s1)).not.toBe(seedToGroup.get(s2));
      }
    });
  });

  describe("2 advancers per group, 16 groups — half-zone constrained seeding", () => {
    // 16 groups × 2 advancers = 32 players in SE bracket (B=32, no byes)
    // Snake seeding: A={1,32}, B={2,31}, C={3,30}, D={4,29}, E={5,28}, F={6,27},
    //               G={7,26}, H={8,25}, I={9,24}, J={10,23}, K={11,22}, L={12,21},
    //               M={13,20}, N={14,19}, O={15,18}, P={16,17}
    // bracketSeedOrder(32) = [1,32,16,17,8,25,9,24,4,29,13,20,5,28,12,21,
    //                          2,31,15,18,7,26,10,23,3,30,14,19,6,27,11,22]
    // Upper half seeds: {1,4,5,8,9,12,13,16,17,20,21,24,25,28,29,32}
    // Lower half seeds: {2,3,6,7,10,11,14,15,18,19,22,23,26,27,30,31}
    // Winners: G1(up) G2(lo) G3(lo) G4(up) G5(up) G6(lo) G7(lo) G8(up)
    //          G9(up) G10(lo) G11(lo) G12(up) G13(up) G14(lo) G15(lo) G16(up)
    // Runner-up pool seeds 17–32: upper={17,20,21,24,25,28,29,32}, lower={18,19,22,23,26,27,30,31}
    // Runners-up descending (G16→G1):
    //   G16(up)→lo→18  G15(lo)→up→17  G14(lo)→up→20  G13(up)→lo→19
    //   G12(up)→lo→22  G11(lo)→up→21  G10(lo)→up→24  G9(up)→lo→23
    //   G8(up)→lo→26   G7(lo)→up→25   G6(lo)→up→28   G5(up)→lo→27
    //   G4(up)→lo→30   G3(lo)→up→29   G2(lo)→up→32   G1(up)→lo→31
    // All 16 R1 pairs are real (no byes)
    const groups = Array.from({ length: 16 }, (_, i) =>
      g(i + 1, [
        s(`g${i + 1}w`, `G${i + 1} Win`, 1, 1),
        s(`g${i + 1}r`, `G${i + 1} Run`, 0, 2),
      ])
    );

    it("returns 32 advancers", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      expect(result.advancers).toHaveLength(32);
    });

    it("winners assigned seeds 1–16 in ascending group order", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      for (let i = 1; i <= 16; i++) {
        expect(byId.get(`g${i}w`)!.seSeed).toBe(i);
      }
    });

    it("runners-up assigned via half-zone constraint", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const byId = new Map(result.advancers.map((a) => [a.playerProfileId, a]));
      const expected: [string, number][] = [
        ["g16r", 18], ["g15r", 17], ["g14r", 20], ["g13r", 19],
        ["g12r", 22], ["g11r", 21], ["g10r", 24], ["g9r",  23],
        ["g8r",  26], ["g7r",  25], ["g6r",  28], ["g5r",  27],
        ["g4r",  30], ["g3r",  29], ["g2r",  32], ["g1r",  31],
      ];
      for (const [id, seed] of expected) {
        expect(byId.get(id)!.seSeed).toBe(seed);
      }
    });

    it("no same-group R1 pairings (all 16 pairs are real)", () => {
      const result = computeAdvancers(groups, 2, new Map());
      if (!result.ok) throw new Error("expected ok");
      const seedToGroup = new Map(result.advancers.map((a) => [a.seSeed, a.groupNumber]));
      const r1Pairs = [
        [1,32],[16,17],[8,25],[9,24],[4,29],[13,20],[5,28],[12,21],
        [2,31],[15,18],[7,26],[10,23],[3,30],[14,19],[6,27],[11,22],
      ];
      for (const [s1, s2] of r1Pairs) {
        expect(seedToGroup.get(s1)).not.toBe(seedToGroup.get(s2));
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
