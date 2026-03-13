import { describe, it, expect } from "vitest";
import { buildRoundRobinSchedule, MIN_RR_PLAYERS, MAX_RR_PLAYERS } from "@/server/algorithms/round-robin";

describe("buildRoundRobinSchedule", () => {
  it("throws for fewer than 3 players", () => {
    expect(() => buildRoundRobinSchedule(["a", "b"])).toThrow();
  });

  it("throws for more than 6 players", () => {
    expect(() => buildRoundRobinSchedule(["a", "b", "c", "d", "e", "f", "g"])).toThrow();
  });

  it("generates correct number of matches for 4 players (4C2 = 6)", () => {
    const { matches } = buildRoundRobinSchedule(["a", "b", "c", "d"]);
    expect(matches).toHaveLength(6);
  });

  it("generates correct number of matches for 3 players (3C2 = 3)", () => {
    const { matches } = buildRoundRobinSchedule(["a", "b", "c"]);
    expect(matches).toHaveLength(3);
  });

  it("generates correct number of matches for 6 players (6C2 = 15)", () => {
    const { matches } = buildRoundRobinSchedule(["a", "b", "c", "d", "e", "f"]);
    expect(matches).toHaveLength(15);
  });

  it("every player faces every other player exactly once (4 players)", () => {
    const players = ["p1", "p2", "p3", "p4"];
    const { matches } = buildRoundRobinSchedule(players);

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const matchup = matches.filter(
          (m) =>
            (m.player1Id === players[i] && m.player2Id === players[j]) ||
            (m.player1Id === players[j] && m.player2Id === players[i]),
        );
        expect(matchup).toHaveLength(1);
      }
    }
  });

  it("every player faces every other player exactly once (5 players)", () => {
    const players = ["p1", "p2", "p3", "p4", "p5"];
    const { matches } = buildRoundRobinSchedule(players);

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const matchup = matches.filter(
          (m) =>
            (m.player1Id === players[i] && m.player2Id === players[j]) ||
            (m.player1Id === players[j] && m.player2Id === players[i]),
        );
        expect(matchup).toHaveLength(1);
      }
    }
  });

  it("returns n-1 rounds for even n (4 players → 3 rounds)", () => {
    const { rounds } = buildRoundRobinSchedule(["a", "b", "c", "d"]);
    expect(rounds).toBe(3);
  });

  it("returns n rounds for odd n (3 players → 3 rounds)", () => {
    const { rounds } = buildRoundRobinSchedule(["a", "b", "c"]);
    expect(rounds).toBe(3);
  });

  it("matches in the same round have distinct positions", () => {
    const { matches } = buildRoundRobinSchedule(["a", "b", "c", "d"]);
    const byRound = new Map<number, number[]>();
    for (const m of matches) {
      if (!byRound.has(m.round)) byRound.set(m.round, []);
      byRound.get(m.round)!.push(m.position);
    }
    for (const positions of byRound.values()) {
      const unique = new Set(positions);
      expect(unique.size).toBe(positions.length);
    }
  });

  it("supports MIN and MAX boundary values", () => {
    expect(() => buildRoundRobinSchedule(Array.from({ length: MIN_RR_PLAYERS }, (_, i) => `p${i}`))).not.toThrow();
    expect(() => buildRoundRobinSchedule(Array.from({ length: MAX_RR_PLAYERS }, (_, i) => `p${i}`))).not.toThrow();
  });
});
