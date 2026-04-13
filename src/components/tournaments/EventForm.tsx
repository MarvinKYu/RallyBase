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
  advancersPerGroup?: number | null;
  gamePointTarget?: number;
  rrFormat?: string | null;
  rrGamePointTarget?: number | null;
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
            defaultValue={state?.fields?.["ratingCategoryId"] ?? ""}
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
          defaultValue={isEditMode ? defaultValues?.name : state?.fields?.["name"] ?? undefined}
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
            {defaultValues.eventFormat === "ROUND_ROBIN"
              ? "Round Robin"
              : defaultValues.eventFormat === "RR_TO_SE"
                ? "Round Robin → Single Elimination"
                : "Single Elimination"}
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
            defaultValue={state?.fields?.["eventFormat"] ?? "SINGLE_ELIMINATION"}
            onChange={(e) => setSelectedEventFormat(e.target.value)}
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="RR_TO_SE">Round Robin → Single Elimination</option>
          </select>
        </div>
      )}

      {/* Group size — for Round Robin and RR → SE events */}
      {(selectedEventFormat === "ROUND_ROBIN" ||
        selectedEventFormat === "RR_TO_SE" ||
        defaultValues?.eventFormat === "ROUND_ROBIN" ||
        defaultValues?.eventFormat === "RR_TO_SE") && (
        <div className="space-y-1">
          <label htmlFor="groupSize" className="block text-sm font-medium text-text-2">
            Group size{" "}
            {selectedEventFormat === "RR_TO_SE" || defaultValues?.eventFormat === "RR_TO_SE" ? (
              <span className="text-red-400">*</span>
            ) : (
              <span className="font-normal text-text-3">(optional)</span>
            )}
          </label>
          <select
            id="groupSize"
            name="groupSize"
            defaultValue={state?.fields?.["groupSize"] ?? String(defaultValues?.groupSize ?? "")}
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {(selectedEventFormat === "ROUND_ROBIN" ||
              defaultValues?.eventFormat === "ROUND_ROBIN") && (
              <option value="">Single group (up to 6 players)</option>
            )}
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

      {/* Advancers per group — only for RR → SE events */}
      {(selectedEventFormat === "RR_TO_SE" || defaultValues?.eventFormat === "RR_TO_SE") && (
        <div className="space-y-1">
          <label htmlFor="advancersPerGroup" className="block text-sm font-medium text-text-2">
            Advancers per group <span className="text-red-400">*</span>
          </label>
          <select
            id="advancersPerGroup"
            name="advancersPerGroup"
            defaultValue={state?.fields?.["advancersPerGroup"] ?? String(defaultValues?.advancersPerGroup ?? "1")}
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="1">1 player advances per group</option>
            <option value="2">2 players advance per group</option>
          </select>
          <p className="text-xs text-text-3">
            Must be less than the group size. Players are seeded into the bracket using
            constrained half-zone placement to avoid same-group R1 pairings.
          </p>
          {state?.fieldErrors?.advancersPerGroup && (
            <p className="text-sm text-red-400">{state.fieldErrors.advancersPerGroup[0]}</p>
          )}
        </div>
      )}

      {/* Match format — two rows for RR→SE, one row for all other formats */}
      {selectedEventFormat === "RR_TO_SE" || defaultValues?.eventFormat === "RR_TO_SE" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="rrFormat" className="block text-sm font-medium text-text-2">
                RR match format
              </label>
              <select
                id="rrFormat"
                name="rrFormat"
                defaultValue={isEditMode ? defaultValues?.rrFormat ?? "BEST_OF_5" : state?.fields?.["rrFormat"] ?? "BEST_OF_5"}
                className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="BEST_OF_3">Best of 3</option>
                <option value="BEST_OF_5">Best of 5</option>
                <option value="BEST_OF_7">Best of 7</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="rrGamePointTarget" className="block text-sm font-medium text-text-2">
                RR points per game
              </label>
              <select
                id="rrGamePointTarget"
                name="rrGamePointTarget"
                defaultValue={isEditMode ? String(defaultValues?.rrGamePointTarget ?? 11) : state?.fields?.["rrGamePointTarget"] ?? "11"}
                className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="11">First to 11</option>
                <option value="21">First to 21</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="format" className="block text-sm font-medium text-text-2">
                SE match format
              </label>
              <select
                id="format"
                name="format"
                defaultValue={isEditMode ? defaultValues?.format ?? "BEST_OF_5" : state?.fields?.["format"] ?? "BEST_OF_5"}
                className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="BEST_OF_3">Best of 3</option>
                <option value="BEST_OF_5">Best of 5</option>
                <option value="BEST_OF_7">Best of 7</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="gamePointTarget" className="block text-sm font-medium text-text-2">
                SE points per game
              </label>
              <select
                id="gamePointTarget"
                name="gamePointTarget"
                defaultValue={isEditMode ? String(defaultValues?.gamePointTarget ?? 11) : state?.fields?.["gamePointTarget"] ?? "11"}
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
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="format" className="block text-sm font-medium text-text-2">
              Match format
            </label>
            <select
              id="format"
              name="format"
              defaultValue={isEditMode ? defaultValues?.format ?? "BEST_OF_5" : state?.fields?.["format"] ?? "BEST_OF_5"}
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
              defaultValue={isEditMode ? String(defaultValues?.gamePointTarget ?? 11) : state?.fields?.["gamePointTarget"] ?? "11"}
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
      )}

      {/* Start time */}
      <div className="space-y-1">
        <label htmlFor="startTime" className="block text-sm font-medium text-text-2">
          Event start time <span className="font-normal text-text-3">(optional, UTC)</span>
        </label>
        <input
          id="startTime"
          name="startTime"
          type="datetime-local"
          defaultValue={isEditMode ? defaultValues?.startTime : state?.fields?.["startTime"] ?? undefined}
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
                  defaultValue={isEditMode ? defaultValues?.maxParticipants ?? undefined : state?.fields?.["maxParticipants"] ?? undefined}
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
                  defaultValue={isEditMode ? defaultValues?.allowedGender ?? "" : state?.fields?.["allowedGender"] ?? ""}
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
                  defaultValue={isEditMode ? defaultValues?.minRating ?? undefined : state?.fields?.["minRating"] ?? undefined}
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
                  defaultValue={isEditMode ? defaultValues?.maxRating ?? undefined : state?.fields?.["maxRating"] ?? undefined}
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
                  defaultValue={isEditMode ? defaultValues?.minAge ?? undefined : state?.fields?.["minAge"] ?? undefined}
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
                  defaultValue={isEditMode ? defaultValues?.maxAge ?? undefined : state?.fields?.["maxAge"] ?? undefined}
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
