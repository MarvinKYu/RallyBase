import Link from "next/link";
import { type RoundRobinStanding } from "@/server/services/bracket.service";

export function StandingsTable({
  standings,
  tournamentId,
}: {
  standings: RoundRobinStanding[];
  tournamentId: string;
}) {
  return (
    <div className="overflow-hidden border-b border-border-subtle">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle bg-elevated">
            <th className="px-2 py-1.5 text-left font-medium text-text-3">#</th>
            <th className="px-2 py-1.5 text-left font-medium text-text-3">Player</th>
            <th className="px-2 py-1.5 text-right font-medium text-text-3">W</th>
            <th className="px-2 py-1.5 text-right font-medium text-text-3">L</th>
            <th className="px-2 py-1.5 text-right font-medium text-text-3">G</th>
            <th className="px-2 py-1.5 text-right font-medium text-text-3">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr
              key={s.playerProfileId}
              className="border-b border-border-subtle bg-surface last:border-b-0"
            >
              <td className="px-2 py-1.5 text-text-3">{s.tied ? `T-${s.rank}` : s.rank}</td>
              <td className="px-2 py-1.5 font-medium text-text-1">
                <Link
                  href={`/profile/${s.playerProfileId}`}
                  className="truncate hover:text-accent hover:underline"
                >
                  {s.displayName}
                </Link>
              </td>
              <td className="px-2 py-1.5 text-right text-accent">{s.wins}</td>
              <td className="px-2 py-1.5 text-right text-text-2">{s.losses}</td>
              <td className="px-2 py-1.5 text-right text-text-3">
                {s.gamesWon}–{s.gamesLost}
              </td>
              <td className="px-2 py-1.5 text-right text-text-3">
                {s.pointsFor}–{s.pointsAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
