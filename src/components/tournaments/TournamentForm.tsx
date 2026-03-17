"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createTournamentAction, type TournamentActionState } from "@/server/actions/tournament.actions";

type Org = { id: string; name: string };

export function TournamentForm({ organizations }: { organizations: Org[] }) {
  const [state, dispatch, isPending] = useActionState<TournamentActionState, FormData>(
    createTournamentAction,
    null,
  );
  const [showScheduling, setShowScheduling] = useState(false);

  return (
    <form action={dispatch} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="organizationId" className="block text-sm font-medium text-text-2">
          Organization <span className="text-red-400">*</span>
        </label>
        <select
          id="organizationId"
          name="organizationId"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Select an organization…</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.organizationId && (
          <p className="text-sm text-red-400">{state.fieldErrors.organizationId[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-text-2">
          Tournament name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Spring Open 2026"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="block text-sm font-medium text-text-2">
          Location <span className="font-normal text-text-3">(optional)</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. Chicago, IL"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {state?.fieldErrors?.location && (
          <p className="text-sm text-red-400">{state.fieldErrors.location[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-text-2">
            Start date <span className="text-red-400">*</span>
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {state?.fieldErrors?.startDate && (
            <p className="text-sm text-red-400">{state.fieldErrors.startDate[0]}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-text-2">
            End date <span className="font-normal text-text-3">(optional)</span>
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Scheduling — optional */}
      <div className="space-y-4 rounded-md border border-border-subtle bg-elevated p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-2">Scheduling</p>
          <button
            type="button"
            onClick={() => setShowScheduling(!showScheduling)}
            className="text-xs text-accent hover:text-accent-dim"
          >
            {showScheduling ? "Hide" : "Add scheduling"}
          </button>
        </div>

        {showScheduling && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="startTime" className="block text-xs font-medium text-text-3">
                Tournament start time
              </label>
              <input
                id="startTime"
                name="startTime"
                type="datetime-local"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="withdrawDeadline" className="block text-xs font-medium text-text-3">
                Withdrawal deadline
              </label>
              <input
                id="withdrawDeadline"
                name="withdrawDeadline"
                type="datetime-local"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="text-xs text-text-3">
                If not set, defaults to 24 hours before tournament start time.
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating tournament…" : "Create tournament"}
      </button>
    </form>
  );
}
