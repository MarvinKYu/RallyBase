"use client";

import { useTransition } from "react";
import { withdrawFromEventAction } from "@/server/actions/tournament.actions";

export function WithdrawButton({
  eventId,
  tournamentId,
}: {
  eventId: string;
  tournamentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const boundAction = withdrawFromEventAction.bind(null, eventId, tournamentId);

  function handleClick() {
    if (!window.confirm("Are you sure you want to withdraw from this event?")) return;
    startTransition(async () => {
      await boundAction();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md border border-red-900 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Withdrawing…" : "Withdraw"}
    </button>
  );
}
