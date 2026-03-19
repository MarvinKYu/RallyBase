"use client";

import { useActionState } from "react";
import { advanceEventStatusAction } from "@/server/actions/tournament.actions";

type Props = {
  eventId: string;
  tournamentId: string;
  label: string;
  className?: string;
};

export function AdvanceEventStatusButton({ eventId, tournamentId, label, className }: Props) {
  const [state, dispatch] = useActionState(
    advanceEventStatusAction.bind(null, eventId, tournamentId),
    null,
  );

  return (
    <div>
      <form action={dispatch}>
        <button
          type="submit"
          className={
            className ??
            "rounded-md bg-accent px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
          }
        >
          {label}
        </button>
      </form>
      {state?.error && (
        <p className="mt-1 text-sm text-red-400">{state.error}</p>
      )}
    </div>
  );
}
