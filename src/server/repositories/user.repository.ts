import { prisma } from "@/lib/prisma";

export async function upsertUserFromClerk(
  clerkId: string,
  email: string,
  name: string,
) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ clerkId }, { email }] },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { clerkId, email, name },
    });
  }

  return prisma.user.create({
    data: { clerkId, email, name },
  });
}

export async function findUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({ where: { clerkId } });
}
