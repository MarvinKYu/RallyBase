"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileActionState } from "@/server/actions/player.actions";

interface Props {
  profileId: string;
  defaultValues: {
    displayName: string;
    bio: string;
    gender: string;
    birthDate: string;
  };
}

export function ProfileEditForm({ profileId, defaultValues }: Props) {
  const boundAction = updateProfileAction.bind(null, profileId);
  const [state, dispatch, isPending] = useActionState<ProfileActionState, FormData>(
    boundAction,
    null,
  );

  return (
    <form action={dispatch} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="displayName" className="block text-sm font-medium text-text-2">
          Display name <span className="text-red-400">*</span>
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          defaultValue={defaultValues.displayName}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {state?.fieldErrors?.displayName && (
          <p className="text-sm text-red-400">{state.fieldErrors.displayName[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="bio" className="block text-sm font-medium text-text-2">
          Bio <span className="font-normal text-text-3">(optional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={defaultValues.bio}
          placeholder="Tell others about yourself…"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {state?.fieldErrors?.bio && (
          <p className="text-sm text-red-400">{state.fieldErrors.bio[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="gender" className="block text-sm font-medium text-text-2">
          Gender <span className="font-normal text-text-3">(optional)</span>
        </label>
        <select
          id="gender"
          name="gender"
          defaultValue={defaultValues.gender}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Prefer not to say / unset</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="birthDate" className="block text-sm font-medium text-text-2">
          Date of birth <span className="font-normal text-text-3">(optional — used for age-restricted events)</span>
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={defaultValues.birthDate}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {state?.fieldErrors?.birthDate && (
          <p className="text-sm text-red-400">{state.fieldErrors.birthDate[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
