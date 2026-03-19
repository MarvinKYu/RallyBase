"use client";

import { useActionState } from "react";
import { advanceTournamentStatusAction } from "@/server/actions/tournament.actions";

type Props = {
  tournamentId: string;
  label: string;
};

export function AdvanceTournamentStatusButton({ tournamentId, label }: Props) {
  const [state, dispatch] = useActionState(
    advanceTournamentStatusAction.bind(null, tournamentId),
    null,
  );

  return (
    <div>
      <form action={dispatch}>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
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
