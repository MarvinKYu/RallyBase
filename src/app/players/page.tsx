import { Suspense } from "react";
import Link from "next/link";
import { searchPlayers } from "@/server/services/player.service";
import { PlayerSearchForm } from "@/components/players/PlayerSearchForm";

export const metadata = { title: "Find Players — RallyBase" };

type Props = { searchParams: Promise<{ q?: string }> };

async function Results({ query }: { query: string }) {
  if (!query) {
    return (
      <p className="text-sm text-zinc-500">
        Enter a name to search for players.
      </p>
    );
  }

  const players = await searchPlayers(query);

  if (players.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No players found for &ldquo;{query}&rdquo;.
      </p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-zinc-200">
      {players.map((p) => (
        <li key={p.id}>
          <Link
            href={`/profile/${p.id}`}
            className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-50"
          >
            <span className="text-sm font-medium text-zinc-900">
              {p.displayName}
            </span>
            <span className="text-xs text-zinc-400">
              {p.playerRatings.length} rating
              {p.playerRatings.length !== 1 ? "s" : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function PlayersPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Find players
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Search for players by their display name.
          </p>
        </div>

        <Suspense>
          <PlayerSearchForm />
        </Suspense>

        <Suspense
          fallback={<p className="text-sm text-zinc-400">Searching…</p>}
        >
          <Results query={q} />
        </Suspense>
      </div>
    </main>
  );
}
