import { describe, it, expect } from "vitest";
import { assignGroups } from "@/server/algorithms/group-draw";

describe("assignGroups", () => {
  it("throws if groupSize is below minimum (< 3)", () => {
    expect(() => assignGroups(["a", "b", "c", "d"], [1800, 1700, 1600, 1500], 2)).toThrow();
  });

  it("throws if groupSize is above maximum (> 6)", () => {
    expect(() => assignGroups(["a", "b", "c", "d"], [1800, 1700, 1600, 1500], 7)).toThrow();
  });

  it("throws if player count is too low to form valid groups (e.g. 5 players, groupSize 4 → 2 groups but min group size would be 2)", () => {
    const players = ["a", "b", "c", "d", "e"];
    const ratings = [1800, 1700, 1600, 1500, 1400];
    // ceil(5/4) = 2 groups, floor(5/2) = 2 < MIN_RR_PLAYERS → should throw
    expect(() => assignGroups(players, ratings, 4)).toThrow(/Not enough players/);
  });

  it("creates correct number of groups for even split (6 players, groupSize 3 → 2 groups)", () => {
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const ratings = [1800, 1700, 1600, 1500, 1450, 1400];
    const groups = assignGroups(players, ratings, 3);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(3);
    expect(groups[1]).toHaveLength(3);
  });

  it("snake-seeds correctly: 6 players, groupSize 3 → best+4th+5th in G1, 2nd+3rd+6th in G2", () => {
    // Sorted by rating: p1(1800), p2(1700), p3(1600), p4(1500), p5(1450), p6(1400)
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const ratings = [1800, 1700, 1600, 1500, 1450, 1400];
    const groups = assignGroups(players, ratings, 3);
    // Snake: G0←p1, G1←p2, G1←p3, G0←p4, G0←p5, G1←p6
    expect(groups[0]).toEqual(["p1", "p4", "p5"]);
    expect(groups[1]).toEqual(["p2", "p3", "p6"]);
  });

  it("handles uneven split (7 players, groupSize 4 → groups of 3 and 4)", () => {
    const players = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
    const ratings = [1800, 1700, 1600, 1500, 1450, 1400, 1350];
    const groups = assignGroups(players, ratings, 4);
    expect(groups).toHaveLength(2);
    const sizes = groups.map((g) => g.length).sort();
    expect(sizes).toEqual([3, 4]);
  });

  it("all players appear exactly once across all groups", () => {
    const players = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"];
    const ratings = [1900, 1800, 1700, 1600, 1500, 1450, 1400, 1350, 1300];
    const groups = assignGroups(players, ratings, 3);
    const allAssigned = groups.flat();
    expect(allAssigned.sort()).toEqual([...players].sort());
  });

  it("3-group snake seeding (9 players, groupSize 3 → 3 groups of 3)", () => {
    // Sorted: p1(1900), p2(1800), p3(1700), p4(1600), p5(1500), p6(1450), p7(1400), p8(1350), p9(1300)
    const players = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"];
    const ratings = [1900, 1800, 1700, 1600, 1500, 1450, 1400, 1350, 1300];
    const groups = assignGroups(players, ratings, 3);
    expect(groups).toHaveLength(3);
    // Snake: G0←p1, G1←p2, G2←p3, G2←p4, G1←p5, G0←p6, G0←p7, G1←p8, G2←p9
    expect(groups[0]).toEqual(["p1", "p6", "p7"]);
    expect(groups[1]).toEqual(["p2", "p5", "p8"]);
    expect(groups[2]).toEqual(["p3", "p4", "p9"]);
  });

  it("sorts by rating desc before distributing (out-of-order input)", () => {
    // Same players as 2-group test but passed in random order
    const players = ["p4", "p1", "p6", "p2", "p5", "p3"];
    const ratings = [1500, 1800, 1400, 1700, 1450, 1600];
    const groups = assignGroups(players, ratings, 3);
    expect(groups[0]).toEqual(["p1", "p4", "p5"]);
    expect(groups[1]).toEqual(["p2", "p3", "p6"]);
  });

  it("accepts groupSize 6 with 12 players → 2 groups of 6", () => {
    const players = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
    const ratings = Array.from({ length: 12 }, (_, i) => 2000 - i * 50);
    const groups = assignGroups(players, ratings, 6);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(6);
    expect(groups[1]).toHaveLength(6);
  });

  describe("totalGroups override (maxParticipants-driven)", () => {
    it("uses totalGroups instead of Math.ceil(n/groupSize) when provided", () => {
      // 12 players, groupSize 4, maxParticipants 16 → totalGroups = 4
      // Math.ceil(12/4) = 3 (wrong — would under-count groups); 16/4 = 4 (correct)
      // floor(12/4) = 3 >= MIN_RR_PLAYERS so no throw
      const players = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
      const ratings = Array.from({ length: 12 }, (_, i) => 2000 - i * 50);
      const groups = assignGroups(players, ratings, 4, 4);
      expect(groups).toHaveLength(4);
    });

    it("13 players, groupSize 4, maxParticipants 16 → 4 groups matching spec example", () => {
      // Spec example from bug-list.md:
      // A(1300) B(1280) C(1260) D(1240) E(1220) F(1200) G(1180) H(1160) I(1140) J(1120) K(1100) L(1080) M(1060)
      // Snake: G1, G2, G3, G4, G4, G3, G2, G1, G1, G2, G3, G4, G4
      // Group 1: (A, H, I), Group 2: (B, G, J), Group 3: (C, F, K), Group 4: (D, E, L, M)
      const players = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
      const ratings = [1300, 1280, 1260, 1240, 1220, 1200, 1180, 1160, 1140, 1120, 1100, 1080, 1060];
      const groups = assignGroups(players, ratings, 4, 4);
      expect(groups).toHaveLength(4);
      expect(groups[0]).toEqual(["A", "H", "I"]);
      expect(groups[1]).toEqual(["B", "G", "J"]);
      expect(groups[2]).toEqual(["C", "F", "K"]);
      expect(groups[3]).toEqual(["D", "E", "L", "M"]);
    });

    it("throws if totalGroups leaves some groups with fewer than MIN_RR_PLAYERS", () => {
      // 5 players, groupSize 4, totalGroups 3 → floor(5/3)=1 < 3
      const players = ["p1", "p2", "p3", "p4", "p5"];
      const ratings = [1800, 1700, 1600, 1500, 1400];
      expect(() => assignGroups(players, ratings, 4, 3)).toThrow(/Not enough players/);
    });
  });
});
