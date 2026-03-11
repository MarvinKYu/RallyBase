import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Prisma singleton", () => {
  beforeEach(() => {
    // Clear the cached global so each test starts fresh
    const g = globalThis as unknown as { prisma?: unknown };
    delete g.prisma;
    // Wipe vitest module cache so the module re-executes
    vi.resetModules();
  });

  it("exports a PrismaClient instance", async () => {
    const { prisma } = await import("@/lib/prisma");
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });

  it("stores the instance on globalThis outside production", async () => {
    // NODE_ENV is already "test" in the vitest environment
    const { prisma } = await import("@/lib/prisma");
    const g = globalThis as unknown as { prisma?: unknown };
    expect(g.prisma).toBe(prisma);
  });

  it("returns the same instance on repeated imports (singleton)", async () => {
    const { prisma: first } = await import("@/lib/prisma");
    const { prisma: second } = await import("@/lib/prisma");
    expect(first).toBe(second);
  });
});
