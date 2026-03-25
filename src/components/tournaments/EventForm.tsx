"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  createEventAction,
  type TournamentActionState,
} from "@/server/actions/tournament.actions";

type RatingCategory = { id: string; name: string };

type EventDefaultValues = {
  name?: string;
  format?: string;
  eventFormat?: string;
  groupSize?: number | null;
  gamePointTarget?: number;
  startTime?: string;
  maxParticipants?: number | null;
  minRating?: number | null;
  maxRating?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  allowedGender?: string | null;
  ratingCategoryName?: string;
};

export function EventForm({
  tournamentId = "",
  ratingCategories = [],
  isTournamentCreator = false,
  action,
  defaultValues,
  submitLabel,
}: {
  tournamentId?: string;
  ratingCategories?: RatingCategory[];
  isTournamentCreator?: boolean;
  action?: (prevState: TournamentActionState, formData: FormData) => Promise<TournamentActionState>;
  defaultValues?: EventDefaultValues;
  submitLabel?: string;
}) {
  const resolvedAction = action ?? createEventAction.bind(null, tournamentId);
  const [state, dispatch, isPending] = useActionState<TournamentActionState, FormData>(
    resolvedAction,
    null,
  );
  const [showEligibility, setShowEligibility] = useState(
    !!(
      defaultValues?.maxParticipants ||
      defaultValues?.minRating ||
      defaultValues?.maxRating ||
      defaultValues?.minAge ||
      defaultValues?.maxAge ||
      defaultValues?.allowedGender
    ),
  );
  // Track selected event format so groupSize field shows/hides reactively in create mode
  const [selectedEventFormat, setSelectedEventFormat] = useState(
    defaultValues?.eventFormat ?? "SINGLE_ELIMINATION",
  );

  const isEditMode = !!defaultValues;
  const effectiveSubmitLabel = submitLabel ?? (isEditMode ? "Save changes" : "Create event");

  return (
    <form action={dispatch} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Rating category — select in create mode, read-only in edit mode */}
      {isEditMode ? (
        <div className="space-y-1">
          <p className="block text-sm font-medium text-text-2">Rating category</p>
          <p className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1">
            {defaultValues.ratingCategoryName ?? "—"}
          </p>
          <p className="text-xs text-text-3">Rating category cannot be changed after creation.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <label htmlFor="ratingCategoryId" className="block text-sm font-medium text-text-2">
            Rating category <span className="text-red-400">*</span>
          </label>
          <select
            id="ratingCategoryId"
            name="ratingCategoryId"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Select a rating category…</option>
            {ratingCategories.map((rc) => (
              <option key={rc.id} value={rc.id}>
                {rc.name}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.ratingCategoryId && (
            <p className="text-sm text-red-400">{state.fieldErrors.ratingCategoryId[0]}</p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-text-2">
          Event name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultValues?.name}
          placeholder="e.g. U1800 Singles"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Event format — select in create mode, read-only in edit mode */}
      {isEditMode ? (
        <div className="space-y-1">
          <p className="block text-sm font-medium text-text-2">Event format</p>
          <p className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1">
            {defaultValues.eventFormat === "ROUND_ROBIN" ? "Round Robin" : "Single Elimination"}
          </p>
          <p className="text-xs text-text-3">Event format cannot be changed after creation.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <label htmlFor="eventFormat" className="block text-sm font-medium text-text-2">
            Event format
          </label>
          <select
            id="eventFormat"
            name="eventFormat"
            defaultValue="SINGLE_ELIMINATION"
            onChange={(e) => setSelectedEventFormat(e.target.value)}
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="ROUND_ROBIN">Round Robin</option>
          </select>
        </div>
      )}

      {/* Group size — only for Round Robin events */}
      {(selectedEventFormat === "ROUND_ROBIN" || defaultValues?.eventFormat === "ROUND_ROBIN") && (
        <div className="space-y-1">
          <label htmlFor="groupSize" className="block text-sm font-medium text-text-2">
            Group size <span className="font-normal text-text-3">(optional)</span>
          </label>
          <select
            id="groupSize"
            name="groupSize"
            defaultValue={String(defaultValues?.groupSize ?? "")}
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Single group (up to 6 players)</option>
            <option value="3">3 players per group</option>
            <option value="4">4 players per group</option>
            <option value="5">5 players per group</option>
            <option value="6">6 players per group</option>
          </select>
          <p className="text-xs text-text-3">
            Players are distributed into groups by rating using snake seeding.
          </p>
          {state?.fieldErrors?.groupSize && (
            <p className="text-sm text-red-400">{state.fieldErrors.groupSize[0]}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="format" className="block text-sm font-medium text-text-2">
            Match format
          </label>
          <select
            id="format"
            name="format"
            defaultValue={defaultValues?.format ?? "BEST_OF_5"}
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="BEST_OF_3">Best of 3</option>
            <option value="BEST_OF_5">Best of 5</option>
            <option value="BEST_OF_7">Best of 7</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="gamePointTarget" className="block text-sm font-medium text-text-2">
            Points per game
          </label>
          <select
            id="gamePointTarget"
            name="gamePointTarget"
            defaultValue={String(defaultValues?.gamePointTarget ?? 11)}
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="11">First to 11</option>
            <option value="21">First to 21</option>
          </select>
          {state?.fieldErrors?.gamePointTarget && (
            <p className="text-sm text-red-400">{state.fieldErrors.gamePointTarget[0]}</p>
          )}
        </div>
      </div>

      {/* Start time */}
      <div className="space-y-1">
        <label htmlFor="startTime" className="block text-sm font-medium text-text-2">
          Event start time <span className="font-normal text-text-3">(optional, UTC)</span>
        </label>
        <input
          id="startTime"
          name="startTime"
          type="datetime-local"
          defaultValue={defaultValues?.startTime}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Eligibility settings — TD only */}
      {(isTournamentCreator || isEditMode) && (
        <div className="space-y-4 rounded-md border border-border-subtle bg-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-2">Eligibility restrictions</p>
            <button
              type="button"
              onClick={() => setShowEligibility(!showEligibility)}
              className="text-xs text-accent hover:text-accent-dim"
            >
              {showEligibility ? "Hide" : "Add restrictions"}
            </button>
          </div>

          {showEligibility && (
            <div className="grid grid-cols-2 gap-3">
              {/* Row 1: Max participants + Gender restriction */}
              <div className="space-y-1">
                <label htmlFor="maxParticipants" className="block text-xs font-medium text-text-3">
                  Max participants
                </label>
                <input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  min="2"
                  defaultValue={defaultValues?.maxParticipants ?? undefined}
                  placeholder="e.g. 8"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="allowedGender" className="block text-xs font-medium text-text-3">
                  Gender restriction
                </label>
                <select
                  id="allowedGender"
                  name="allowedGender"
                  defaultValue={defaultValues?.allowedGender ?? ""}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">No restriction</option>
                  <option value="MALE">Male only</option>
                  <option value="FEMALE">Female only</option>
                </select>
              </div>

              {/* Row 2: Min rating + Max rating */}
              <div className="space-y-1">
                <label htmlFor="minRating" className="block text-xs font-medium text-text-3">
                  Min rating
                </label>
                <input
                  id="minRating"
                  name="minRating"
                  type="number"
                  defaultValue={defaultValues?.minRating ?? undefined}
                  placeholder="e.g. 1200"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="maxRating" className="block text-xs font-medium text-text-3">
                  Max rating
                </label>
                <input
                  id="maxRating"
                  name="maxRating"
                  type="number"
                  defaultValue={defaultValues?.maxRating ?? undefined}
                  placeholder="e.g. 1800"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Row 3: Min age + Max age */}
              <div className="space-y-1">
                <label htmlFor="minAge" className="block text-xs font-medium text-text-3">
                  Min age
                </label>
                <input
                  id="minAge"
                  name="minAge"
                  type="number"
                  min="1"
                  defaultValue={defaultValues?.minAge ?? undefined}
                  placeholder="e.g. 18"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="maxAge" className="block text-xs font-medium text-text-3">
                  Max age
                </label>
                <input
                  id="maxAge"
                  name="maxAge"
                  type="number"
                  min="1"
                  defaultValue={defaultValues?.maxAge ?? undefined}
                  placeholder="e.g. 18"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `${effectiveSubmitLabel}…` : effectiveSubmitLabel}
      </button>
    </form>
  );
}
