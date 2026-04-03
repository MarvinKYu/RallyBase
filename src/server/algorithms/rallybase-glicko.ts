import type { RatingAlgorithm } from "@/server/algorithms/rating-algorithm";

const DEFAULT_RATING = 1200;
const DEFAULT_RD = 300;
const DEFAULT_SIGMA = 0.06;
const MIN_RATING = 100;
const MAX_RD = 350;
const MIN_RD = 40;
const BASE_K = 120;
const JUNIOR_RD_MIN = 220;
const INACTIVITY_RD_GROWTH_C = 100;
const DAYS_PER_MS = 86_400_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function inflateRdForInactivity(
  rd: number,
  daysInactive: number,
  isJunior: boolean,
): number {
  const c = INACTIVITY_RD_GROWTH_C * (isJunior ? 1.25 : 1);
  const inflated = Math.sqrt((rd ** 2) + (c * Math.max(daysInactive, 0)));
  const clamped = clamp(inflated, MIN_RD, MAX_RD);
  return isJunior ? Math.max(clamped, JUNIOR_RD_MIN) : clamped;
}

function expectedWinProb(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, -((ratingA - ratingB) / 400)));
}

function effectiveK(
  rd: number,
  sigma: number,
  matchesPlayed: number,
  isJunior: boolean,
): number {
  const rdFactor = clamp(rd / 200, 0.6, 1.8);
  const sigmaFactor = clamp(sigma / DEFAULT_SIGMA, 0.7, 1.6);
  const newBoost = matchesPlayed < 20 ? 1.25 : 1;
  const juniorBoost = isJunior ? 1.1 : 1;
  return BASE_K * rdFactor * sigmaFactor * newBoost * juniorBoost;
}

function updateRd(rd: number, matchesPlayed: number): number {
  const rdMultiplier = matchesPlayed < 30 ? 0.92 : 0.97;
  return clamp(rd * rdMultiplier, MIN_RD, MAX_RD);
}

function updateSigma(sigma: number, delta: number): number {
  const sigmaMultiplier = Math.abs(delta) > BASE_K ? 1.005 : 0.995;
  return clamp(sigma * sigmaMultiplier, 0.03, 0.2);
}

export function getMatchDayFromDate(nowMs: number): number {
  const epochMs = new Date("2025-01-01").getTime();
  return Math.floor((nowMs - epochMs) / DAYS_PER_MS);
}

export const rallybaseGlickoAlgorithm: RatingAlgorithm = {
  defaultRating: DEFAULT_RATING,
  calcMatchResult: ({
    winnerRating,
    loserRating,
    winnerGamesPlayed,
    loserGamesPlayed,
    winnerRd,
    loserRd,
    winnerSigma,
    loserSigma,
    winnerLastActiveDay,
    loserLastActiveDay,
    winnerIsJunior = false,
    loserIsJunior = false,
    matchDay,
  }) => {
    const effectiveMatchDay = matchDay ?? getMatchDayFromDate(Date.now());

    const winnerPreMatchRd = inflateRdForInactivity(
      winnerRd ?? DEFAULT_RD,
      winnerLastActiveDay == null ? 0 : effectiveMatchDay - winnerLastActiveDay,
      winnerIsJunior,
    );
    const loserPreMatchRd = inflateRdForInactivity(
      loserRd ?? DEFAULT_RD,
      loserLastActiveDay == null ? 0 : effectiveMatchDay - loserLastActiveDay,
      loserIsJunior,
    );

    const winnerPreMatchSigma = winnerSigma ?? DEFAULT_SIGMA;
    const loserPreMatchSigma = loserSigma ?? DEFAULT_SIGMA;

    const winnerExpected = expectedWinProb(winnerRating, loserRating);
    const loserExpected = expectedWinProb(loserRating, winnerRating);

    const winnerK = effectiveK(
      winnerPreMatchRd,
      winnerPreMatchSigma,
      winnerGamesPlayed,
      winnerIsJunior,
    );
    const loserK = effectiveK(
      loserPreMatchRd,
      loserPreMatchSigma,
      loserGamesPlayed,
      loserIsJunior,
    );

    const winnerDelta = Math.max(0, winnerK * (1 - winnerExpected));
    const loserDelta = loserK * (0 - loserExpected);

    return {
      winner: {
        delta: winnerDelta,
        newRating: Math.max(MIN_RATING, winnerRating + winnerDelta),
        newRd: updateRd(winnerPreMatchRd, winnerGamesPlayed),
        newSigma: updateSigma(winnerPreMatchSigma, winnerDelta),
      },
      loser: {
        delta: loserDelta,
        newRating: Math.max(MIN_RATING, loserRating + loserDelta),
        newRd: updateRd(loserPreMatchRd, loserGamesPlayed),
        newSigma: updateSigma(loserPreMatchSigma, loserDelta),
      },
    };
  },
};
