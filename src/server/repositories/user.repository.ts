import { prisma } from "@/lib/prisma";

export async function upsertUserFromClerk(
  clerkId: string,
  email: string,
  name: string,
) {
  return prisma.user.upsert({
    where: { clerkId },
    update: { email, name },
    create: { clerkId, email, name },
  });
}

export async function findUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({ where: { clerkId } });
}
