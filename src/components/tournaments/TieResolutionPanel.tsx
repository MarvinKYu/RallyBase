import { resolveTieAction } from "@/server/actions/bracket.actions";
import type { TiedGroup } from "@/server/services/bracket.service";

/**
 * Displayed on the manage event page when an RR→SE event has ties at the
 * advancement boundary. The TD selects which player advances per tied group.
 */
export function TieResolutionPanel({
  ties,
  eventId,
  tournamentId,
}: {
  ties: TiedGroup[];
  eventId: string;
  tournamentId: string;
}) {
  return (
    <div className="rounded-md border border-amber-800 bg-amber-950/40 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-amber-300">Bracket generation blocked — tie detected</p>
        <p className="mt-1 text-xs text-amber-400/80">
          Select which player advances from each tied group to continue.
        </p>
      </div>

      {ties.map((tie) => (
        <div key={`${tie.groupNumber}-${tie.rank}`} className="space-y-2">
          <p className="text-xs font-medium text-text-2">
            Group {tie.groupNumber} — tied for rank {tie.rank}
          </p>
          <div className="space-y-1.5">
            {tie.tiedPlayers.map((player) => {
              const excludedIds = tie.tiedPlayers
                .filter((p) => p.playerProfileId !== player.playerProfileId)
                .map((p) => p.playerProfileId);

              const boundAction = resolveTieAction.bind(
                null,
                eventId,
                tournamentId,
                tie.groupNumber,
                player.playerProfileId,
                excludedIds,
              );

              return (
                <form key={player.playerProfileId} action={boundAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 transition-colors hover:border-accent hover:bg-elevated"
                  >
                    <span>{player.displayName}</span>
                    <span className="text-xs text-accent">Advance →</span>
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
