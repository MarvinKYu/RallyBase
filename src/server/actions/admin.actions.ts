"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  isPlatformAdmin,
  assignOrgAdmin,
  removeOrgAdmin,
  adminSetPlayerRating,
} from "@/server/services/admin.service";

export type AdminActionState = { error?: string; success?: boolean } | null;

// profileId, ratingCategoryId are pre-bound via .bind()
export async function adminSetRatingAction(
  profileId: string,
  ratingCategoryId: string,
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated." };

  const newRatingStr = formData.get("rating") as string;
  const newRating = parseFloat(newRatingStr);
  if (isNaN(newRating) || newRating < 0) return { error: "Invalid rating value." };

  const result = await adminSetPlayerRating(profileId, ratingCategoryId, newRating, userId);
  if ("error" in result) return { error: result.error };

  redirect(`/admin/players/${profileId}`);
}

// organizationId is pre-bound via .bind()
export async function assignOrgAdminAction(
  organizationId: string,
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated." };
  if (!(await isPlatformAdmin(userId))) return { error: "Not authorized." };

  const playerNumber = parseInt(formData.get("playerNumber") as string, 10);
  if (isNaN(playerNumber)) return { error: "Invalid player number." };

  const profile = await prisma.playerProfile.findUnique({
    where: { playerNumber },
    select: { userId: true },
  });
  if (!profile) return { error: `No player found with number ${playerNumber}.` };

  await assignOrgAdmin(profile.userId, organizationId);
  redirect(`/admin`);
}

// orgAdminId is pre-bound via .bind()
export async function removeOrgAdminAction(orgAdminId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  if (!(await isPlatformAdmin(userId!))) throw new Error("Not authorized.");

  await removeOrgAdmin(orgAdminId);
  redirect(`/admin`);
}
