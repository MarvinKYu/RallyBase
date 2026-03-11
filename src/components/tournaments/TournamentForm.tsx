"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTournamentSchema, type CreateTournamentInput } from "@/lib/schemas/tournament";
import {
  createTournamentAction,
  type TournamentActionState,
} from "@/server/actions/tournament.actions";

type Org = { id: string; name: string };

export function TournamentForm({ organizations }: { organizations: Org[] }) {
  const [state, dispatch, isPending] = useActionState<TournamentActionState, FormData>(
    createTournamentAction,
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
  });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("organizationId", data.organizationId);
    fd.set("name", data.name);
    if (data.location) fd.set("location", data.location);
    fd.set("startDate", data.startDate);
    if (data.endDate) fd.set("endDate", data.endDate);
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
        <label htmlFor="organizationId" className="block text-sm font-medium text-zinc-700">
          Organization <span className="text-red-500">*</span>
        </label>
        <select
          id="organizationId"
          {...register("organizationId")}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select an organization…</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {(errors.organizationId || state?.fieldErrors?.organizationId) && (
          <p className="text-sm text-red-600">
            {errors.organizationId?.message ?? state?.fieldErrors?.organizationId?.[0]}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Tournament name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          placeholder="e.g. Spring Open 2026"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {(errors.name || state?.fieldErrors?.name) && (
          <p className="text-sm text-red-600">
            {errors.name?.message ?? state?.fieldErrors?.name?.[0]}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="block text-sm font-medium text-zinc-700">
          Location <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <input
          id="location"
          type="text"
          {...register("location")}
          placeholder="e.g. Chicago, IL"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {(errors.location || state?.fieldErrors?.location) && (
          <p className="text-sm text-red-600">
            {errors.location?.message ?? state?.fieldErrors?.location?.[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-zinc-700">
            Start date <span className="text-red-500">*</span>
          </label>
          <input
            id="startDate"
            type="date"
            {...register("startDate")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          {(errors.startDate || state?.fieldErrors?.startDate) && (
            <p className="text-sm text-red-600">
              {errors.startDate?.message ?? state?.fieldErrors?.startDate?.[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-zinc-700">
            End date <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="endDate"
            type="date"
            {...register("endDate")}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating tournament…" : "Create tournament"}
      </button>
    </form>
  );
}
