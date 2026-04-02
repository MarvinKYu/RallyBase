"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  isPlatformAdmin,
  isOrgAdminForOrg,
  assignOrgAdmin,
  removeOrgAdmin,
  assignTournamentCreator,
  removeTournamentCreator,
  adminSetPlayerRating,
  adminAddInitialRating,
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

// profileId is pre-bound via .bind()
export async function adminAddInitialRatingAction(
  profileId: string,
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated." };

  const ratingCategoryId = formData.get("ratingCategoryId") as string;
  const newRatingStr = formData.get("rating") as string;
  const newRating = parseFloat(newRatingStr);

  if (!ratingCategoryId) return { error: "Select a discipline." };
  if (isNaN(newRating) || newRating < 0) return { error: "Invalid rating value." };

  const result = await adminAddInitialRating(profileId, ratingCategoryId, Math.round(newRating), userId);
  if ("error" in result) return { error: result.error };

  redirect(`/admin/players/${profileId}`);
}

// profileId is pre-bound via .bind()
export async function adminSetDobAction(
  profileId: string,
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { userId } = await auth();
  if (!userId || !(await isPlatformAdmin(userId))) return { error: "Not authorized." };

  const birthDate = (formData.get("birthDate") as string)?.trim();
  if (!birthDate) {
    await prisma.playerProfile.update({ where: { id: profileId }, data: { birthDate: null } });
  } else {
    const parsed = new Date(birthDate);
    if (isNaN(parsed.getTime())) return { error: "Invalid date." };
    await prisma.playerProfile.update({ where: { id: profileId }, data: { birthDate: parsed } });
  }

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

// organizationId is pre-bound via .bind()
export async function assignTournamentCreatorAction(
  organizationId: string,
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated." };

  const authorized = (await isPlatformAdmin(userId)) || (await isOrgAdminForOrg(userId, organizationId));
  if (!authorized) return { error: "Not authorized." };

  const playerNumber = parseInt(formData.get("playerNumber") as string, 10);
  if (isNaN(playerNumber)) return { error: "Invalid player number." };

  const profile = await prisma.playerProfile.findUnique({
    where: { playerNumber },
    select: { userId: true },
  });
  if (!profile) return { error: `No player found with number ${playerNumber}.` };

  await assignTournamentCreator(profile.userId, organizationId);
  redirect("/admin");
}

// allowlistEntryId is pre-bound via .bind()
export async function removeTournamentCreatorAction(allowlistEntryId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const entry = await prisma.tournamentCreatorAllowlist.findUnique({
    where: { id: allowlistEntryId },
    select: { organizationId: true },
  });
  if (!entry) throw new Error("Allowlist entry not found.");

  const authorized = (await isPlatformAdmin(userId!)) || (await isOrgAdminForOrg(userId!, entry.organizationId));
  if (!authorized) throw new Error("Not authorized.");

  await removeTournamentCreator(allowlistEntryId);
  redirect("/admin");
}

// orgAdminId is pre-bound via .bind()
export async function removeOrgAdminAction(orgAdminId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  if (!(await isPlatformAdmin(userId!))) throw new Error("Not authorized.");

  await removeOrgAdmin(orgAdminId);
  redirect(`/admin`);
}
