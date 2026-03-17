import { describe, it, expect } from "vitest";
import { isWithdrawalAllowed } from "@/server/services/tournament.service";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-04-01T12:00:00Z");

describe("isWithdrawalAllowed", () => {
  it("allows withdrawal when withdrawDeadline is set and in the future", () => {
    const tournament = {
      withdrawDeadline: new Date("2026-04-01T13:00:00Z"),
      startTime: null,
    };
    expect(isWithdrawalAllowed(tournament, now)).toBe(true);
  });

  it("blocks withdrawal when withdrawDeadline is set and in the past", () => {
    const tournament = {
      withdrawDeadline: new Date("2026-04-01T11:00:00Z"),
      startTime: null,
    };
    expect(isWithdrawalAllowed(tournament, now)).toBe(false);
  });

  it("allows withdrawal when no withdrawDeadline but startTime is >24h away", () => {
    const tournament = {
      withdrawDeadline: null,
      startTime: new Date(now.getTime() + 25 * HOUR),
    };
    expect(isWithdrawalAllowed(tournament, now)).toBe(true);
  });

  it("blocks withdrawal when no withdrawDeadline but startTime is <24h away", () => {
    const tournament = {
      withdrawDeadline: null,
      startTime: new Date(now.getTime() + 23 * HOUR),
    };
    expect(isWithdrawalAllowed(tournament, now)).toBe(false);
  });

  it("always allows withdrawal when no withdrawDeadline and no startTime", () => {
    const tournament = {
      withdrawDeadline: null,
      startTime: null,
    };
    expect(isWithdrawalAllowed(tournament, now)).toBe(true);
  });
});
