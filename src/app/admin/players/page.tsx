import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/server/services/admin.service";
import { searchPlayers } from "@/server/services/player.service";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata = { title: "Manage Players — RallyBase Admin" };

export default async function AdminPlayersPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) notFound();

  const { q = "" } = await searchParams;
  const players = q ? await searchPlayers(q) : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-1">Players</h1>
            <p className="mt-0.5 text-sm text-text-3">Search and manage player ratings.</p>
          </div>
          <Link href="/admin" className="text-sm text-text-2 hover:text-text-1 transition-colors">
            ← Admin
          </Link>
        </div>

        <form method="GET" className="flex gap-2">
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Search by name or player #…"
            className="flex-1 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
          >
            Search
          </button>
        </form>

        {q && players.length === 0 && (
          <p className="text-sm text-text-3">No players found for &quot;{q}&quot;.</p>
        )}

        {players.length > 0 && (
          <ul className="overflow-hidden rounded-lg border border-border">
            {players.map((p) => (
              <li key={p.id} className="border-b border-border-subtle last:border-b-0">
                <Link
                  href={`/admin/players/${p.id}`}
                  className="flex items-center justify-between bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-text-1">{p.displayName}</p>
                    <p className="text-xs text-text-3">#{p.playerNumber}</p>
                  </div>
                  <span className="text-xs text-text-3">
                    {p.playerRatings.length} rating{p.playerRatings.length !== 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!q && (
          <p className="text-sm text-text-3">Enter a name or player number to search.</p>
        )}
      </div>
    </main>
  );
}
