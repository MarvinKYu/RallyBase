import { describe, expect, it } from "vitest";
import { rallybaseGlickoAlgorithm } from "@/server/algorithms/rallybase-glicko";

describe("rallybaseGlickoAlgorithm", () => {
  it("handles a big mismatch conservatively", () => {
    const result = rallybaseGlickoAlgorithm.calcMatchResult({
      winnerRating: 1600,
      loserRating: 1000,
      winnerGamesPlayed: 60,
      loserGamesPlayed: 60,
      winnerRd: 80,
      loserRd: 80,
      winnerSigma: 0.06,
      loserSigma: 0.06,
      matchDay: 100,
    });

    expect(result.winner.delta).toBeGreaterThan(0);
    expect(result.winner.delta).toBeLessThanOrEqual(15);
    expect(result.loser.delta).toBeLessThan(0);
  });

  it("produces moderate updates for a close matchup", () => {
    const result = rallybaseGlickoAlgorithm.calcMatchResult({
      winnerRating: 1200,
      loserRating: 1300,
      winnerGamesPlayed: 25,
      loserGamesPlayed: 25,
      winnerRd: 220,
      loserRd: 220,
      winnerSigma: 0.06,
      loserSigma: 0.06,
      matchDay: 100,
    });

    expect(result.winner.delta).toBeGreaterThan(0);
    expect(result.winner.delta).toBeLessThan(120);
    expect(result.loser.delta).toBeLessThan(0);
    expect(Math.abs(result.loser.delta)).toBeLessThan(120);
  });

  it("never lets the winner lose rating", () => {
    const result = rallybaseGlickoAlgorithm.calcMatchResult({
      winnerRating: 100,
      loserRating: 3000,
      winnerGamesPlayed: 200,
      loserGamesPlayed: 200,
      winnerRd: 40,
      loserRd: 350,
      winnerSigma: 0.03,
      loserSigma: 0.2,
      matchDay: 100,
    });

    expect(result.winner.delta).toBeGreaterThanOrEqual(0);
    expect(result.winner.newRating).toBeGreaterThanOrEqual(100);
  });

  it("never drops the loser below the rating floor", () => {
    const result = rallybaseGlickoAlgorithm.calcMatchResult({
      winnerRating: 2500,
      loserRating: 101,
      winnerGamesPlayed: 150,
      loserGamesPlayed: 150,
      winnerRd: 40,
      loserRd: 350,
      winnerSigma: 0.06,
      loserSigma: 0.2,
      matchDay: 100,
    });

    expect(result.loser.newRating).toBeGreaterThanOrEqual(100);
  });

  it("gives new players a larger movement boost", () => {
    const provisional = rallybaseGlickoAlgorithm.calcMatchResult({
      winnerRating: 1200,
      loserRating: 1200,
      winnerGamesPlayed: 0,
      loserGamesPlayed: 0,
      winnerRd: 300,
      loserRd: 300,
      winnerSigma: 0.06,
      loserSigma: 0.06,
      matchDay: 100,
    });

    const established = rallybaseGlickoAlgorithm.calcMatchResult({
      winnerRating: 1200,
      loserRating: 1200,
      winnerGamesPlayed: 40,
      loserGamesPlayed: 40,
      winnerRd: 120,
      loserRd: 120,
      winnerSigma: 0.06,
      loserSigma: 0.06,
      matchDay: 100,
    });

    expect(provisional.winner.delta).toBeGreaterThan(established.winner.delta);
    expect(Math.abs(provisional.loser.delta)).toBeGreaterThan(Math.abs(established.loser.delta));
  });

  it("inflates RD for inactive returners without changing the rating input", () => {
    const result = rallybaseGlickoAlgorithm.calcMatchResult({
      winnerRating: 1600,
      loserRating: 1500,
      winnerGamesPlayed: 50,
      loserGamesPlayed: 50,
      winnerRd: 80,
      loserRd: 80,
      winnerSigma: 0.06,
      loserSigma: 0.06,
      winnerLastActiveDay: 0,
      loserLastActiveDay: 99,
      matchDay: 365,
    });

    expect(result.winner.newRd).toBeGreaterThan(result.loser.newRd!);
    expect(result.winner.newRating).toBeGreaterThan(1600);
  });
});
