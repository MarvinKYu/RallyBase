"use client";

import { useActionState } from "react";
import { createTournamentAction, type TournamentActionState } from "@/server/actions/tournament.actions";

type Org = { id: string; name: string };

export function TournamentForm({ organizations }: { organizations: Org[] }) {
  const [state, dispatch, isPending] = useActionState<TournamentActionState, FormData>(
    createTournamentAction,
    null,
  );

  return (
    <form action={dispatch} className="space-y-6">
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
          name="organizationId"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select an organization…</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.organizationId && (
          <p className="text-sm text-red-600">{state.fieldErrors.organizationId[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Tournament name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Spring Open 2026"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="block text-sm font-medium text-zinc-700">
          Location <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. Chicago, IL"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {state?.fieldErrors?.location && (
          <p className="text-sm text-red-600">{state.fieldErrors.location[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-zinc-700">
            Start date <span className="text-red-500">*</span>
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          {state?.fieldErrors?.startDate && (
            <p className="text-sm text-red-600">{state.fieldErrors.startDate[0]}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-zinc-700">
            End date <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
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
