import { describe, it, expect } from "vitest";
import { getRoundLabel } from "@/lib/bracket-labels";

describe("getRoundLabel", () => {
  it("1 round total → Final", () => {
    expect(getRoundLabel(1, 1)).toBe("Final");
  });

  it("2 rounds: round 1 → Semifinal, round 2 → Final", () => {
    expect(getRoundLabel(1, 2)).toBe("Semifinal");
    expect(getRoundLabel(2, 2)).toBe("Final");
  });

  it("3 rounds: QF → SF → Final", () => {
    expect(getRoundLabel(1, 3)).toBe("Quarterfinal");
    expect(getRoundLabel(2, 3)).toBe("Semifinal");
    expect(getRoundLabel(3, 3)).toBe("Final");
  });

  it("4 rounds: R16 → QF → SF → Final", () => {
    expect(getRoundLabel(1, 4)).toBe("Round of 16");
    expect(getRoundLabel(2, 4)).toBe("Quarterfinal");
    expect(getRoundLabel(3, 4)).toBe("Semifinal");
    expect(getRoundLabel(4, 4)).toBe("Final");
  });

  it("5 rounds: R32 → R16 → QF → SF → Final", () => {
    expect(getRoundLabel(1, 5)).toBe("Round of 32");
    expect(getRoundLabel(2, 5)).toBe("Round of 16");
    expect(getRoundLabel(3, 5)).toBe("Quarterfinal");
    expect(getRoundLabel(4, 5)).toBe("Semifinal");
    expect(getRoundLabel(5, 5)).toBe("Final");
  });

  it("6 rounds: R64 → R32 → R16 → QF → SF → Final", () => {
    expect(getRoundLabel(1, 6)).toBe("Round of 64");
    expect(getRoundLabel(2, 6)).toBe("Round of 32");
    expect(getRoundLabel(3, 6)).toBe("Round of 16");
    expect(getRoundLabel(4, 6)).toBe("Quarterfinal");
    expect(getRoundLabel(5, 6)).toBe("Semifinal");
    expect(getRoundLabel(6, 6)).toBe("Final");
  });
});
