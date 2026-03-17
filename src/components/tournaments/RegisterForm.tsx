"use client";

import { useActionState } from "react";
import {
  registerForEventsAction,
  type RegisterActionState,
} from "@/server/actions/tournament.actions";
import { WithdrawButton } from "./WithdrawButton";

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

type EventRow = {
  id: string;
  name: string;
  startTime: Date | null;
  status: string;
  alreadyRegistered: boolean;
  eligibility: { eligible: true } | { eligible: false; reason: string };
};

type Props = {
  tournamentId: string;
  tournamentName: string;
  tournamentStartTime: Date | null;
  events: EventRow[];
};

export function RegisterForm({
  tournamentId,
  tournamentName,
  tournamentStartTime,
  events,
}: Props) {
  const boundAction = registerForEventsAction.bind(null, tournamentId);
  const [state, dispatch, isPending] = useActionState<RegisterActionState, FormData>(
    boundAction,
    null,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-3">Register for events</p>
        <h1 className="text-3xl font-semibold text-text-1">{tournamentName}</h1>
        {tournamentStartTime && (
          <p className="mt-1 text-sm text-text-3">
            Starts {tournamentStartTime.toLocaleString()}
          </p>
        )}
      </div>

      {state?.generalError && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.generalError}
        </p>
      )}

      <form action={dispatch} className="space-y-4">
        <ul className="overflow-hidden rounded-lg border border-border">
          {events.map((event) => {
            const isOpen = event.status === "REGISTRATION_OPEN";
            const canSelect = isOpen && event.eligibility.eligible && !event.alreadyRegistered;
            const perEventError = state?.errors[event.id];

            return (
              <li
                key={event.id}
                className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  {!event.alreadyRegistered && (
                    <input
                      type="checkbox"
                      name="eventIds"
                      value={event.id}
                      disabled={!canSelect}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-accent disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  )}
                  {event.alreadyRegistered && <div className="mt-0.5 h-4 w-4" />}
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-text-1">{event.name}</p>
                    {event.startTime && (
                      <p className="text-xs text-text-3">{event.startTime.toLocaleString()}</p>
                    )}
                    {perEventError && (
                      <p className="text-xs text-red-400">{perEventError}</p>
                    )}
                    {!event.alreadyRegistered && !event.eligibility.eligible && (
                      <p className="text-xs text-text-3">
                        Ineligible: {(event.eligibility as { eligible: false; reason: string }).reason}
                      </p>
                    )}
                    {!event.alreadyRegistered && !isOpen && event.eligibility.eligible && (
                      <p className="text-xs text-text-3">{statusLabel[event.status] ?? event.status}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {event.alreadyRegistered ? (
                    <>
                      <span className="text-xs font-medium text-accent">Registered</span>
                      <WithdrawButton eventId={event.id} tournamentId={tournamentId} />
                    </>
                  ) : (
                    <span className={`text-xs ${isOpen ? "text-accent" : "text-text-3"}`}>
                      {statusLabel[event.status] ?? event.status}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Registering…" : "Register Selected"}
        </button>
      </form>
    </div>
  );
}
