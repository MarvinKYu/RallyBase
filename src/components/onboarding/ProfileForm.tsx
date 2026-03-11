"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProfileSchema,
  type CreateProfileInput,
} from "@/lib/schemas/player";
import {
  createProfileAction,
  type ProfileActionState,
} from "@/server/actions/player.actions";

export function ProfileForm() {
  const [state, dispatch, isPending] = useActionState<
    ProfileActionState,
    FormData
  >(createProfileAction, null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema),
  });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("displayName", data.displayName);
    if (data.bio) fd.set("bio", data.bio);
    dispatch(fd);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-zinc-700"
        >
          Display name <span className="text-red-500">*</span>
        </label>
        <input
          id="displayName"
          type="text"
          {...register("displayName")}
          placeholder="e.g. Alex Chen"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {(errors.displayName || state?.fieldErrors?.displayName) && (
          <p className="text-sm text-red-600">
            {errors.displayName?.message ?? state?.fieldErrors?.displayName?.[0]}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-zinc-700"
        >
          Bio{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="bio"
          rows={4}
          {...register("bio")}
          placeholder="Tell other players a bit about yourself…"
          className="w-full resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {(errors.bio || state?.fieldErrors?.bio) && (
          <p className="text-sm text-red-600">
            {errors.bio?.message ?? state?.fieldErrors?.bio?.[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating profile…" : "Create profile"}
      </button>
    </form>
  );
}
