"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventSchema, type CreateEventInput } from "@/lib/schemas/tournament";
import {
  createEventAction,
  type TournamentActionState,
} from "@/server/actions/tournament.actions";

type RatingCategory = { id: string; name: string };

export function EventForm({
  tournamentId,
  ratingCategories,
}: {
  tournamentId: string;
  ratingCategories: RatingCategory[];
}) {
  const boundAction = createEventAction.bind(null, tournamentId);
  const [state, dispatch, isPending] = useActionState<TournamentActionState, FormData>(
    boundAction,
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { format: "BEST_OF_5", gamePointTarget: 11 },
  });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("ratingCategoryId", data.ratingCategoryId);
    fd.set("name", data.name);
    fd.set("format", data.format);
    fd.set("gamePointTarget", String(data.gamePointTarget));
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
        <label htmlFor="ratingCategoryId" className="block text-sm font-medium text-zinc-700">
          Rating category <span className="text-red-500">*</span>
        </label>
        <select
          id="ratingCategoryId"
          {...register("ratingCategoryId")}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select a rating category…</option>
          {ratingCategories.map((rc) => (
            <option key={rc.id} value={rc.id}>
              {rc.name}
            </option>
          ))}
        </select>
        {(errors.ratingCategoryId || state?.fieldErrors?.ratingCategoryId) && (
          <p className="text-sm text-red-600">
            {errors.ratingCategoryId?.message ?? state?.fieldErrors?.ratingCategoryId?.[0]}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Event name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          placeholder="e.g. U1800 Singles"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {(errors.name || state?.fieldErrors?.name) && (
          <p className="text-sm text-red-600">
            {errors.name?.message ?? state?.fieldErrors?.name?.[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="format" className="block text-sm font-medium text-zinc-700">
            Match format
          </label>
          <select
            id="format"
            {...register("format")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="BEST_OF_3">Best of 3</option>
            <option value="BEST_OF_5">Best of 5</option>
            <option value="BEST_OF_7">Best of 7</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="gamePointTarget" className="block text-sm font-medium text-zinc-700">
            Points per game
          </label>
          <select
            id="gamePointTarget"
            {...register("gamePointTarget")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value={11}>First to 11</option>
            <option value={21}>First to 21</option>
          </select>
          {(errors.gamePointTarget || state?.fieldErrors?.gamePointTarget) && (
            <p className="text-sm text-red-600">
              {errors.gamePointTarget?.message ?? state?.fieldErrors?.gamePointTarget?.[0]}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating event…" : "Create event"}
      </button>
    </form>
  );
}
