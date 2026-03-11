import { describe, it, expect } from "vitest";
import {
  validateGameScore,
  validateMatchSubmission,
  WINS_NEEDED,
  MAX_GAMES,
} from "@/server/algorithms/match-validation";

describe("validateGameScore", () => {
  it("returns 'unplayed' for 0–0", () => {
    expect(validateGameScore(0, 0, 11)).toBe("unplayed");
  });

  it("returns 'p1' when player 1 wins at 11 with 2-point lead", () => {
    expect(validateGameScore(11, 9, 11)).toBe("p1");
    expect(validateGameScore(13, 11, 11)).toBe("p1");
  });

  it("returns 'p2' when player 2 wins at 11 with 2-point lead", () => {
    expect(validateGameScore(9, 11, 11)).toBe("p2");
    expect(validateGameScore(11, 13, 11)).toBe("p2");
  });

  it("returns 'invalid' when neither player has reached target", () => {
    expect(validateGameScore(9, 8, 11)).toBe("invalid");
    expect(validateGameScore(10, 10, 11)).toBe("invalid");
  });

  it("returns 'invalid' when a player reaches target but lead < 2", () => {
    expect(validateGameScore(11, 10, 11)).toBe("invalid");
    expect(validateGameScore(10, 11, 11)).toBe("invalid");
  });

  it("handles first-to-21 point target", () => {
    expect(validateGameScore(21, 19, 21)).toBe("p1");
    expect(validateGameScore(21, 20, 21)).toBe("invalid");
    expect(validateGameScore(23, 21, 21)).toBe("p1");
  });
});

describe("validateMatchSubmission — BEST_OF_5", () => {
  const bo5 = (games: [number, number][]) =>
    validateMatchSubmission(
      games.map(([p1, p2]) => ({ player1Points: p1, player2Points: p2 })),
      "BEST_OF_5",
      11,
    );

  it("accepts a valid 3-0 match", () => {
    const r = bo5([[11, 7], [11, 5], [11, 3], [0, 0], [0, 0]]);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.winner).toBe("player1");
      expect(r.p1Wins).toBe(3);
      expect(r.gamesPlayed).toBe(3);
    }
  });

  it("accepts a valid 3-2 match", () => {
    const r = bo5([[11, 9], [8, 11], [11, 6], [9, 11], [11, 8]]);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.winner).toBe("player1");
      expect(r.p1Wins).toBe(3);
      expect(r.p2Wins).toBe(2);
      expect(r.gamesPlayed).toBe(5);
    }
  });

  it("accepts player 2 winning", () => {
    const r = bo5([[9, 11], [7, 11], [5, 11], [0, 0], [0, 0]]);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.winner).toBe("player2");
  });

  it("rejects a gap (0-0 before match is decided)", () => {
    const r = bo5([[11, 7], [0, 0], [11, 5], [0, 0], [0, 0]]);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/game 2/i);
  });

  it("rejects a game played after match is decided", () => {
    const r = bo5([[11, 7], [11, 5], [11, 3], [9, 11], [0, 0]]);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/game 4/i);
  });

  it("rejects an invalid game score", () => {
    const r = bo5([[11, 10], [11, 5], [11, 3], [0, 0], [0, 0]]);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/game 1/i);
  });

  it("rejects when no winner determined (all zeros)", () => {
    const r = bo5([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]);
    expect(r.valid).toBe(false);
  });
});

describe("validateMatchSubmission — BEST_OF_3", () => {
  const bo3 = (games: [number, number][]) =>
    validateMatchSubmission(
      games.map(([p1, p2]) => ({ player1Points: p1, player2Points: p2 })),
      "BEST_OF_3",
      11,
    );

  it("accepts a 2-0 win", () => {
    const r = bo3([[11, 5], [11, 8], [0, 0]]);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.gamesPlayed).toBe(2);
  });

  it("accepts a 2-1 win", () => {
    const r = bo3([[11, 5], [8, 11], [11, 7]]);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.gamesPlayed).toBe(3);
  });
});

describe("WINS_NEEDED / MAX_GAMES constants", () => {
  it("WINS_NEEDED maps correctly", () => {
    expect(WINS_NEEDED["BEST_OF_3"]).toBe(2);
    expect(WINS_NEEDED["BEST_OF_5"]).toBe(3);
    expect(WINS_NEEDED["BEST_OF_7"]).toBe(4);
  });

  it("MAX_GAMES maps correctly", () => {
    expect(MAX_GAMES["BEST_OF_3"]).toBe(3);
    expect(MAX_GAMES["BEST_OF_5"]).toBe(5);
    expect(MAX_GAMES["BEST_OF_7"]).toBe(7);
  });
});
