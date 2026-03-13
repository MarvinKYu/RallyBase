"use client";

import { useTransition } from "react";
import { deleteTournamentAction } from "@/server/actions/tournament.actions";

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (
      !confirm(
        "Delete this tournament? This will permanently remove all events, matches, and results.",
      )
    )
      return;
    startTransition(() => deleteTournamentAction(tournamentId));
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete tournament"}
    </button>
  );
}
