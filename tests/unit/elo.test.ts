import { describe, it, expect } from "vitest";
import {
  DEFAULT_RATING,
  getKFactor,
  expectedScore,
  calculateElo,
  calculateMatchElo,
} from "@/server/algorithms/elo";

describe("getKFactor", () => {
  it("returns 32 for provisional players (< 30 games)", () => {
    expect(getKFactor(0)).toBe(32);
    expect(getKFactor(1)).toBe(32);
    expect(getKFactor(29)).toBe(32);
  });

  it("returns 24 for established players (30–99 games)", () => {
    expect(getKFactor(30)).toBe(24);
    expect(getKFactor(99)).toBe(24);
  });

  it("returns 16 for experienced players (≥ 100 games)", () => {
    expect(getKFactor(100)).toBe(16);
    expect(getKFactor(500)).toBe(16);
  });
});

describe("expectedScore", () => {
  it("returns 0.5 when both players have equal ratings", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
  });

  it("returns > 0.5 when player rating is higher than opponent", () => {
    expect(expectedScore(1600, 1500)).toBeGreaterThan(0.5);
  });

  it("returns < 0.5 when player rating is lower than opponent", () => {
    expect(expectedScore(1400, 1500)).toBeLessThan(0.5);
  });

  it("returns ~0.76 for a 200-point advantage", () => {
    // 1 / (1 + 10^(-200/400)) = 1 / (1 + 10^-0.5) ≈ 0.7597
    expect(expectedScore(1700, 1500)).toBeCloseTo(0.7597, 3);
  });
});

describe("calculateElo", () => {
  it("increases rating on a win", () => {
    const result = calculateElo(1500, 1500, "win");
    expect(result.newRating).toBeGreaterThan(1500);
    expect(result.delta).toBeGreaterThan(0);
  });

  it("decreases rating on a loss", () => {
    const result = calculateElo(1500, 1500, "loss");
    expect(result.newRating).toBeLessThan(1500);
    expect(result.delta).toBeLessThan(0);
  });

  it("gain is smaller when beating a weaker opponent", () => {
    const vsWeak = calculateElo(1700, 1500, "win");
    const vsStrong = calculateElo(1500, 1700, "win");
    expect(vsStrong.delta).toBeGreaterThan(vsWeak.delta);
  });

  it("loss is smaller when losing to a stronger opponent", () => {
    const vsStrong = calculateElo(1500, 1700, "loss");
    const vsWeak = calculateElo(1700, 1500, "loss");
    expect(Math.abs(vsStrong.delta)).toBeLessThan(Math.abs(vsWeak.delta));
  });

  it("respects a custom kFactor", () => {
    const k16 = calculateElo(1500, 1500, "win", 16);
    const k32 = calculateElo(1500, 1500, "win", 32);
    expect(k16.delta).toBeCloseTo(k32.delta / 2, 5);
  });

  it("uses default K=32 when kFactor is omitted", () => {
    const result = calculateElo(1500, 1500, "win");
    // delta = 32 * (1 - 0.5) = 16
    expect(result.delta).toBeCloseTo(16, 5);
  });
});

describe("calculateMatchElo", () => {
  it("winner gains rating and loser loses rating", () => {
    const { winner, loser } = calculateMatchElo(1500, 1500, 0, 0);
    expect(winner.delta).toBeGreaterThan(0);
    expect(loser.delta).toBeLessThan(0);
  });

  it("applies independent K-factors based on games played", () => {
    // Winner is experienced (K=16), loser is provisional (K=32)
    const { winner, loser } = calculateMatchElo(1500, 1500, 100, 0);
    expect(winner.delta).toBeCloseTo(8, 3);   // 16 * 0.5
    expect(loser.delta).toBeCloseTo(-16, 3);  // 32 * -0.5
  });

  it("returns correct newRating values", () => {
    const { winner, loser } = calculateMatchElo(1500, 1500, 0, 0);
    expect(winner.newRating).toBeCloseTo(1500 + winner.delta, 5);
    expect(loser.newRating).toBeCloseTo(1500 + loser.delta, 5);
  });

  it("DEFAULT_RATING is 1500", () => {
    expect(DEFAULT_RATING).toBe(1500);
  });
});
