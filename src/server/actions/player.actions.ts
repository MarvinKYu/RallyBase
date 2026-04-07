"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createPlayerProfile, updatePlayerProfile, deleteAccount } from "@/server/services/player.service";

export type ProfileActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function createProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const data = {
    displayName: formData.get("displayName") as string,
    bio: (formData.get("bio") as string) || undefined,
    gender: formData.get("gender") as string,
    birthDate: formData.get("birthDate") as string,
  };

  const result = await createPlayerProfile(data);

  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/profile/${result.profile.id}`);
}

export async function deleteAccountAction(): Promise<{ error: string } | null> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in." };

  const result = await deleteAccount(userId);
  if ("error" in result) return { error: result.error };

  redirect("/");
}

// profileId is pre-bound via .bind(null, profileId)
export async function updateProfileAction(
  profileId: string,
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { userId } = await auth();
  if (!userId) return { error: "You must be signed in." };

  const data = {
    displayName: formData.get("displayName") as string,
    bio: (formData.get("bio") as string) || undefined,
    gender: (formData.get("gender") as string) || undefined,
    showGender: formData.get("showGender") === "true",
    showAge: formData.get("showAge") === "true",
  };

  const result = await updatePlayerProfile(profileId, userId, data);

  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/profile/${profileId}`);
}
