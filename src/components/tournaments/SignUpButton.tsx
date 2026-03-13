"use client";

import { useActionState } from "react";
import {
  signUpForEventAction,
  type TournamentActionState,
} from "@/server/actions/tournament.actions";

export function SignUpButton({
  eventId,
  tournamentId,
}: {
  eventId: string;
  tournamentId: string;
}) {
  const boundAction = signUpForEventAction.bind(null, eventId, tournamentId);
  const [state, dispatch, isPending] = useActionState<TournamentActionState, FormData>(
    boundAction,
    null,
  );

  return (
    <div className="space-y-2">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}
      <form action={dispatch}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Registering…" : "Register for this event"}
        </button>
      </form>
    </div>
  );
}
