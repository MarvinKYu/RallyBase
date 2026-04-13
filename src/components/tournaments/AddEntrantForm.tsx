"use client";

import { useActionState, useState } from "react";
import { addBulkEntrantsAction } from "@/server/actions/tournament.actions";

type SearchPlayer = {
  id: string;
  displayName: string;
  rating: number | null;
};

type Props = {
  eventId: string;
  tournamentId: string;
  players: SearchPlayer[];
};

export function AddEntrantForm({ eventId, tournamentId, players }: Props) {
  const [state, dispatch, isPending] = useActionState(
    addBulkEntrantsAction.bind(null, eventId, tournamentId),
    null,
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (players.length === 0) return null;

  return (
    <form action={dispatch}>
      {state?.error && (
        <p className="mb-3 text-sm text-red-400">{state.error}</p>
      )}
      {/* Hidden inputs carry ALL selected IDs across pages — checkboxes below are visual only */}
      {Array.from(selectedIds).map((id) => (
        <input key={id} type="hidden" name="playerProfileIds" value={id} />
      ))}
      <ul className="overflow-hidden rounded-lg border border-border">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
          >
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(player.id)}
                onChange={() => toggle(player.id)}
                className="accent-accent"
              />
              <span className="text-sm text-text-1">{player.displayName}</span>
            </label>
            <span className="text-xs text-text-3">
              {player.rating !== null ? Math.round(player.rating) : "Unrated"}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={selectedIds.size === 0 || isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending
            ? "Adding…"
            : selectedIds.size === 0
              ? "Add Selected"
              : `Add ${selectedIds.size} player${selectedIds.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </form>
  );
}
