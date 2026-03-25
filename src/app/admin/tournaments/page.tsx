import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser, getTournamentCreatorNames } from "@/server/services/admin.service";
import { getTournaments, getOrganizations } from "@/server/services/tournament.service";
import { TournamentSearchForm } from "@/components/tournaments/TournamentSearchForm";
import { TournamentPagination } from "@/components/tournaments/TournamentPagination";
import { filterTournaments, paginateItems } from "@/lib/tournament-search";

export const metadata = { title: "All Tournaments — RallyBase Admin" };

const statusBadge: Record<string, string> = {
  DRAFT: "bg-surface border border-border text-text-3",
  PUBLISHED: "bg-blue-950/60 border border-blue-800 text-blue-300",
  IN_PROGRESS: "bg-amber-950/60 border border-amber-800 text-amber-300",
  COMPLETED: "bg-surface border border-border text-text-2",
};

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

export default async function AdminTournamentsPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) notFound();

  const { q = "", org = "", loc = "", after = "", before = "", page = "1" } = await searchParams;

  const [tournaments, organizations] = await Promise.all([
    getTournaments(),
    getOrganizations(),
  ]);

  const filtered = filterTournaments(tournaments, { q, org, loc, after, before });
  const { items, total, totalPages, page: currentPage } = paginateItems(
    filtered,
    parseInt(page, 10),
    10,
  );

  const creatorClerkIds = [...new Set(items.map((t) => t.createdByClerkId).filter(Boolean) as string[])];
  const creatorNames = await getTournamentCreatorNames(creatorClerkIds);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr]">
        {/* Left: title + search */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-1">All Tournaments</h1>
            <p className="mt-0.5 text-sm text-text-3">
              {filtered.length} total
            </p>
          </div>
          <Suspense>
            <TournamentSearchForm organizations={organizations} />
          </Suspense>
          <Link
            href="/admin"
            className="text-sm text-text-2 transition-colors hover:text-text-1"
          >
            ← Admin
          </Link>
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-text-3">No tournaments found.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border">
              {items.map((t) => (
                <li key={t.id} className="border-b border-border-subtle last:border-b-0">
                  <Link
                    href={`/tournaments/${t.id}/manage?from=admin`}
                    className="flex items-center justify-between bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-1">{t.name}</p>
                      <p className="text-xs text-text-3">
                        {t.organization.name} · {new Date(t.startDate).toLocaleDateString()}
                      </p>
                      {t.createdByClerkId && creatorNames.get(t.createdByClerkId) && (
                        <p className="text-xs text-text-3">
                          TD: {creatorNames.get(t.createdByClerkId)}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <span className="text-xs text-text-3">
                        {t.events.length} event{t.events.length !== 1 ? "s" : ""}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[t.status] ?? "bg-surface border border-border text-text-3"}`}
                      >
                        {t.status.replace(/_/g, " ")}
                      </span>
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
