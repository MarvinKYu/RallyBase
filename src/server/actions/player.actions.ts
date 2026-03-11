"use server";

import { redirect } from "next/navigation";
import { createPlayerProfile } from "@/server/services/player.service";

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
  };

  const result = await createPlayerProfile(data);

  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  if ("error" in result) return { error: result.error };

  redirect(`/profile/${result.profile.id}`);
}
