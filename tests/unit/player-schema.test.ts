import { describe, it, expect } from "vitest";
import { createProfileSchema } from "@/lib/schemas/player";

describe("createProfileSchema", () => {
  it("accepts a valid displayName", () => {
    const result = createProfileSchema.safeParse({ displayName: "Alex Chen" });
    expect(result.success).toBe(true);
  });

  it("accepts a displayName with an optional bio", () => {
    const result = createProfileSchema.safeParse({
      displayName: "Alex Chen",
      bio: "Competitive singles player, USATT rated.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts when bio is omitted entirely", () => {
    const result = createProfileSchema.safeParse({ displayName: "Jo" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bio).toBeUndefined();
  });

  it("rejects a displayName shorter than 2 characters", () => {
    const result = createProfileSchema.safeParse({ displayName: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.displayName).toBeDefined();
    }
  });

  it("rejects a displayName longer than 50 characters", () => {
    const result = createProfileSchema.safeParse({
      displayName: "A".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a bio longer than 500 characters", () => {
    const result = createProfileSchema.safeParse({
      displayName: "Alex Chen",
      bio: "B".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.bio).toBeDefined();
    }
  });

  it("accepts a bio of exactly 500 characters", () => {
    const result = createProfileSchema.safeParse({
      displayName: "Alex Chen",
      bio: "B".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects when displayName is missing", () => {
    const result = createProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
