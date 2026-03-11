import { describe, it, expect } from "vitest";
import {
  createTournamentSchema,
  createEventSchema,
  addEntrantSchema,
} from "@/lib/schemas/tournament";

describe("createTournamentSchema", () => {
  it("accepts a valid tournament input", () => {
    const result = createTournamentSchema.safeParse({
      organizationId: "org-abc",
      name: "Spring Open 2026",
      location: "Chicago, IL",
      startDate: "2026-04-01",
      endDate: "2026-04-02",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without optional fields", () => {
    const result = createTournamentSchema.safeParse({
      organizationId: "org-abc",
      name: "Spring Open",
      startDate: "2026-04-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing organizationId", () => {
    const result = createTournamentSchema.safeParse({
      name: "Spring Open",
      startDate: "2026-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty organizationId", () => {
    const result = createTournamentSchema.safeParse({
      organizationId: "",
      name: "Spring Open",
      startDate: "2026-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = createTournamentSchema.safeParse({
      organizationId: "org-abc",
      name: "A",
      startDate: "2026-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = createTournamentSchema.safeParse({
      organizationId: "org-abc",
      name: "A".repeat(101),
      startDate: "2026-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing startDate", () => {
    const result = createTournamentSchema.safeParse({
      organizationId: "org-abc",
      name: "Spring Open",
    });
    expect(result.success).toBe(false);
  });
});

describe("createEventSchema", () => {
  it("accepts a valid event input", () => {
    const result = createEventSchema.safeParse({
      ratingCategoryId: "cat-abc",
      name: "U1800 Singles",
      format: "BEST_OF_5",
      gamePointTarget: 11,
    });
    expect(result.success).toBe(true);
  });

  it("accepts gamePointTarget of 21", () => {
    const result = createEventSchema.safeParse({
      ratingCategoryId: "cat-abc",
      name: "Open Singles",
      format: "BEST_OF_7",
      gamePointTarget: 21,
    });
    expect(result.success).toBe(true);
  });

  it("coerces gamePointTarget string to number", () => {
    const result = createEventSchema.safeParse({
      ratingCategoryId: "cat-abc",
      name: "U1800 Singles",
      format: "BEST_OF_5",
      gamePointTarget: "11",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.gamePointTarget).toBe(11);
  });

  it("rejects invalid gamePointTarget", () => {
    const result = createEventSchema.safeParse({
      ratingCategoryId: "cat-abc",
      name: "U1800 Singles",
      format: "BEST_OF_5",
      gamePointTarget: 15,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid format", () => {
    const result = createEventSchema.safeParse({
      ratingCategoryId: "cat-abc",
      name: "U1800 Singles",
      format: "BEST_OF_9",
      gamePointTarget: 11,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing ratingCategoryId", () => {
    const result = createEventSchema.safeParse({
      name: "U1800 Singles",
      format: "BEST_OF_5",
      gamePointTarget: 11,
    });
    expect(result.success).toBe(false);
  });
});

describe("addEntrantSchema", () => {
  it("accepts a valid playerProfileId", () => {
    const result = addEntrantSchema.safeParse({ playerProfileId: "profile-abc" });
    expect(result.success).toBe(true);
  });

  it("rejects empty playerProfileId", () => {
    const result = addEntrantSchema.safeParse({ playerProfileId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing playerProfileId", () => {
    const result = addEntrantSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
