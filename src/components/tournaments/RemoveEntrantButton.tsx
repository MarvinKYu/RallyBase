"use client";

import { removeEntrantAction } from "@/server/actions/tournament.actions";

export function RemoveEntrantButton({
  eventId,
  tournamentId,
  playerProfileId,
  playerName,
}: {
  eventId: string;
  tournamentId: string;
  playerProfileId: string;
  playerName: string;
}) {
  const action = removeEntrantAction.bind(null, eventId, tournamentId, playerProfileId);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Remove ${playerName} from this event?`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs text-red-400 hover:underline"
      >
        Remove
      </button>
    </form>
  );
}
