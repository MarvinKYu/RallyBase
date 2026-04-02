"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateProfileAction, type ProfileActionState } from "@/server/actions/player.actions";

interface Props {
  profileId: string;
  defaultValues: {
    displayName: string;
    bio: string;
    gender: string;
    birthDate: string;
    showGender: boolean;
    showAge: boolean;
  };
}

export function ProfileEditForm({ profileId, defaultValues }: Props) {
  const boundAction = updateProfileAction.bind(null, profileId);
  const [state, dispatch, isPending] = useActionState<ProfileActionState, FormData>(
    boundAction,
    null,
  );
  const [showGender, setShowGender] = useState(defaultValues.showGender);
  const [showAge, setShowAge] = useState(defaultValues.showAge);

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

      {/* Gender — editable, but visibility is toggled */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="gender" className="block text-sm font-medium text-text-2">
            Gender
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
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-elevated px-3 py-2">
          <span className="text-sm text-text-2">Show gender on public profile</span>
          <button
            type="button"
            role="switch"
            aria-checked={showGender}
            onClick={() => setShowGender((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${showGender ? "bg-accent" : "bg-border"}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${showGender ? "translate-x-4" : "translate-x-0"}`}
            />
          </button>
          <input type="hidden" name="showGender" value={showGender ? "true" : "false"} />
        </div>
      </div>

      {/* Date of birth — read-only display */}
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-2">Date of birth</p>
          <p className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-2">
            {defaultValues.birthDate || <span className="text-text-3">Not set</span>}
          </p>
          <p className="text-xs text-text-3">Date of birth cannot be changed. Contact support if it is incorrect.</p>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-elevated px-3 py-2">
          <span className="text-sm text-text-2">Show age on public profile</span>
          <button
            type="button"
            role="switch"
            aria-checked={showAge}
            onClick={() => setShowAge((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${showAge ? "bg-accent" : "bg-border"}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${showAge ? "translate-x-4" : "translate-x-0"}`}
            />
          </button>
          <input type="hidden" name="showAge" value={showAge ? "true" : "false"} />
        </div>
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
