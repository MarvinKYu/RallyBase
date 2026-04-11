import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/server/services/admin.service";
import { searchPlayers, type SortField, type SortDir } from "@/server/services/player.service";
import { PlayerSortControls } from "@/components/players/PlayerSortControls";
import { PlayerPagination } from "@/components/players/PlayerPagination";

type Props = {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    lDir?: string;
    fDir?: string;
    page?: string;
  }>;
};

export const metadata = { title: "Manage Players — RallyBase Admin" };

export default async function AdminPlayersPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) notFound();

  const {
    q = "",
    sort = "lastName",
    lDir = "asc",
    fDir = "asc",
    page = "1",
  } = await searchParams;

  const { players, total, totalPages, page: currentPage } = await searchPlayers(
    q,
    undefined,
    {
      sort: sort as SortField,
      lDir: lDir as SortDir,
      fDir: fDir as SortDir,
      page: parseInt(page, 10),
    },
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-1">Players</h1>
            <p className="mt-0.5 text-sm text-text-3">Search and manage player ratings.</p>
          </div>
          <Link href="/admin" className="text-sm text-text-2 transition-colors hover:text-text-1">
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

        <Suspense>
          <PlayerSortControls fields={["lastName", "firstName"]} defaultSort="lastName" />
        </Suspense>

        {players.length === 0 ? (
          <p className="text-sm text-text-3">
            {q ? `No players found for "${q}".` : "No players found."}
          </p>
        ) : (
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
                    {p.playerRatings.length === 0
                      ? "Unrated"
                      : `${p.playerRatings.length} rating${p.playerRatings.length !== 1 ? "s" : ""}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Suspense>
          <PlayerPagination page={currentPage} totalPages={totalPages} total={total} />
        </Suspense>
      </div>
    </main>
  );
}
