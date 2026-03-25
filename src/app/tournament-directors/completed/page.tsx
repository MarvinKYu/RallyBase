import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMyTournaments, getOrganizations } from "@/server/services/tournament.service";
import { TournamentSearchForm } from "@/components/tournaments/TournamentSearchForm";
import { TournamentPagination } from "@/components/tournaments/TournamentPagination";
import { filterTournaments, paginateItems } from "@/lib/tournament-search";

export const metadata = { title: "Completed — Tournament Directors — RallyBase" };

type Props = {
  searchParams: Promise<{
    q?: string;
    org?: string;
    loc?: string;
    after?: string;
    before?: string;
    page?: string;
  }>;
};

export default async function TDCompletedPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { q = "", org = "", loc = "", after = "", before = "", page = "1" } = await searchParams;

  const [all, organizations] = await Promise.all([
    getMyTournaments(userId),
    getOrganizations(),
  ]);
  const completed = all.filter((t) => t.status === "COMPLETED");

  const filtered = filterTournaments(completed, { q, org, loc, after, before });
  const { items, total, totalPages, page: currentPage } = paginateItems(
    filtered,
    parseInt(page, 10),
    10,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr]">
        {/* Left: title + search */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-1">Completed</h1>
            <p className="mt-1 text-sm text-text-2">
              {filtered.length} tournament{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Suspense>
            <TournamentSearchForm organizations={organizations} />
          </Suspense>
          <Link
            href="/tournament-directors"
            className="text-sm text-text-2 transition-colors hover:text-text-1"
          >
            ← Back to Tournament Directors
          </Link>
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-text-2">No completed tournaments yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border">
              {items.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tournaments/${t.id}/manage`}
                    className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-1">{t.name}</p>
                      <p className="text-xs text-text-3">
                        {t.organization.name}
                        {t.location ? ` · ${t.location}` : ""}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-xs text-text-2">
                        {new Date(t.startDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-text-3">
                        {t.events.length} event{t.events.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Suspense>
            <TournamentPagination
              page={currentPage}
              totalPages={totalPages}
              total={total}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
