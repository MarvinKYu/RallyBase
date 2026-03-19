"use client";

import { useActionState } from "react";
import { addEntrantAction } from "@/server/actions/tournament.actions";

type SearchPlayer = {
  id: string;
  displayName: string;
  rating: number | null;
};

type Props = {
  eventId: string;
  tournamentId: string;
  players: SearchPlayer[];
  enteredIds: string[];
};

export function AddEntrantForm({ eventId, tournamentId, players, enteredIds }: Props) {
  const [state, dispatch] = useActionState(
    addEntrantAction.bind(null, eventId, tournamentId),
    null,
  );

  const enteredSet = new Set(enteredIds);

  if (players.length === 0) return null;

  return (
    <div>
      {state?.error && (
        <p className="mb-3 text-sm text-red-400">{state.error}</p>
      )}
      <ul className="overflow-hidden rounded-lg border border-border">
        {players.map((player) => {
          const alreadyIn = enteredSet.has(player.id);
          return (
            <li
              key={player.id}
              className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-1">{player.displayName}</span>
                <span className="text-xs text-text-3">
                  {player.rating !== null ? Math.round(player.rating) : "Unrated"}
                </span>
              </div>
              {alreadyIn ? (
                <span className="text-xs text-text-3">Already entered</span>
              ) : (
                <form action={dispatch}>
                  <input type="hidden" name="playerProfileId" value={player.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
                  >
                    Add
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
