import { describe, it, expect, vi } from "vitest";

// Mock Clerk before importing middleware so the module resolves cleanly
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: vi.fn(() => vi.fn()),
  createRouteMatcher: vi.fn(() => vi.fn(() => false)),
}));

describe("Middleware config", () => {
  it("exports a matcher array with two entries", async () => {
    const { config } = await import("@/middleware");
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher).toHaveLength(2);
  });

  it("includes API and tRPC routes", async () => {
    const { config } = await import("@/middleware");
    const apiMatcher = config.matcher.find((m) => m.includes("api|trpc"));
    expect(apiMatcher).toBeDefined();
  });

  it("excludes _next internal routes", async () => {
    const { config } = await import("@/middleware");
    const pageMatcher = config.matcher[0];
    expect(pageMatcher).toContain("_next");
  });

  it("excludes common static file extensions", async () => {
    const { config } = await import("@/middleware");
    const pageMatcher = config.matcher[0];
    // The pattern negates static asset extensions
    expect(pageMatcher).toContain("css");
    expect(pageMatcher).toContain("png");
    expect(pageMatcher).toContain("svg");
    expect(pageMatcher).toContain("ico");
  });
});
