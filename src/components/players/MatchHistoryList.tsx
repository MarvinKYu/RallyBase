import Link from "next/link";
import { findCompletedMatchesByPlayerId } from "@/server/repositories/match.repository";

type Match = Awaited<ReturnType<typeof findCompletedMatchesByPlayerId>>[number];

interface Props {
  matches: Match[];
  playerProfileId: string;
  limit?: number;
}

export default function MatchHistoryList({ matches, playerProfileId, limit }: Props) {
  const displayMatches = limit !== undefined ? matches.slice(0, limit) : matches;
  if (displayMatches.length === 0) {
    return (
      <p className="text-sm text-text-2">No match history yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-3">
            <th className="pb-2 pr-4 font-medium">Tournament · Event</th>
            <th className="pb-2 pr-4 font-medium">Opponent</th>
            <th className="pb-2 pr-4 font-medium">Result</th>
            <th className="pb-2 font-medium">Δ Rating</th>
          </tr>
        </thead>
        <tbody>
          {displayMatches.map((m) => {
            const won = m.winnerId === playerProfileId;
            const opponent = m.player1Id === playerProfileId ? m.player2 : m.player1;

            // Count game wins from official matchGames
            let p1Wins = 0;
            let p2Wins = 0;
            for (const g of m.matchGames) {
              if (g.player1Points > g.player2Points) p1Wins++;
              else p2Wins++;
            }
            const myWins = m.player1Id === playerProfileId ? p1Wins : p2Wins;
            const oppWins = m.player1Id === playerProfileId ? p2Wins : p1Wins;

            const delta = m.ratingTransactions[0]?.delta ?? null;

            return (
              <tr key={m.id} className="border-b border-border-subtle last:border-b-0">
                <td className="py-3 pr-4 text-text-2">
                  <span className="font-medium text-text-1">
                    {m.event.tournament.name}
                  </span>
                  <span className="mx-1 text-text-3">·</span>
                  {m.event.name}
                </td>
                <td className="py-3 pr-4">
                  {opponent ? (
                    <Link
                      href={`/profile/${opponent.id}`}
                      className="text-accent hover:underline"
                    >
                      {opponent.displayName}
                    </Link>
                  ) : (
                    <span className="text-text-3">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`font-semibold ${won ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                  >
                    {won ? "W" : "L"}
                  </span>
                  <span className="ml-1 text-text-2">
                    {myWins}–{oppWins}
                  </span>
                </td>
                <td className="py-3">
                  {delta === null ? (
                    <span className="text-text-3">—</span>
                  ) : (
                    <span
                      className={`font-medium ${delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                    >
                      {(delta >= 0 ? "+" : "") + Number(delta).toFixed(2)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
