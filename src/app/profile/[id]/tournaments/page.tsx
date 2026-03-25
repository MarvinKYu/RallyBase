import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlayerProfile } from "@/server/services/player.service";
import { getPlayerTournamentHistory, getOrganizations } from "@/server/services/tournament.service";
import { TournamentSearchForm } from "@/components/tournaments/TournamentSearchForm";
import { TournamentPagination } from "@/components/tournaments/TournamentPagination";
import { filterTournaments, paginateItems } from "@/lib/tournament-search";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    org?: string;
    loc?: string;
    after?: string;
    before?: string;
    onPage?: string;
    upPage?: string;
    pastPage?: string;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return { title: profile ? `${profile.displayName}'s Tournaments — RallyBase` : "Player not found" };
}

export default async function MyTournamentsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const {
    q = "",
    org = "",
    loc = "",
    after = "",
    before = "",
    onPage = "1",
    upPage = "1",
    pastPage = "1",
  } = await searchParams;

  const [profile, organizations] = await Promise.all([
    getPlayerProfile(id),
    getOrganizations(),
  ]);
  if (!profile) notFound();

  const allTournaments = await getPlayerTournamentHistory(profile.id);
  const filtered = filterTournaments(allTournaments, { q, org, loc, after, before });

  const ongoing = filtered.filter((t) => t.status === "IN_PROGRESS");
  const upcoming = filtered.filter((t) => t.status === "PUBLISHED");
  const past = filtered.filter((t) => t.status === "COMPLETED");

  const ongoingResult = paginateItems(ongoing, parseInt(onPage, 10), 5);
  const upcomingResult = paginateItems(upcoming, parseInt(upPage, 10), 5);
  const pastResult = paginateItems(past, parseInt(pastPage, 10), 5);

  const columns = [
    { label: "Ongoing", result: ongoingResult, pageParam: "onPage" },
    { label: "Upcoming", result: upcomingResult, pageParam: "upPage" },
    { label: "Past", result: pastResult, pageParam: "pastPage" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="space-y-8">
        {/* Top row: title + search */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="shrink-0 space-y-2">
            <h1 className="text-2xl font-semibold text-text-1">
              {profile.displayName}&apos;s Tournaments
            </h1>
            <Link
              href={`/profile/${profile.id}`}
              className="block text-sm text-text-2 transition-colors hover:text-text-1"
            >
              ← Back to profile
            </Link>
          </div>
          <div className="flex-1 min-w-0">
            <Suspense>
              <TournamentSearchForm
                organizations={organizations}
                pageParams={["onPage", "upPage", "pastPage"]}
              />
            </Suspense>
          </div>
        </div>

        {/* 3-column body */}
        {allTournaments.length === 0 ? (
          <p className="text-sm text-text-2">No tournaments yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {columns.map(({ label, result, pageParam }) => (
              <section key={label} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-3">
                  {label} ({result.total})
                </h2>
                {result.items.length === 0 ? (
                  <p className="text-sm text-text-2">None.</p>
                ) : (
                  <ul className="overflow-hidden rounded-lg border border-border">
                    {result.items.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="block border-b border-border-subtle bg-surface px-3 py-2.5 transition-colors last:border-b-0 hover:bg-surface-hover"
                        >
                          <p className="text-sm font-medium text-text-1">{t.name}</p>
                          <p className="text-xs text-text-3">
                            {t.organization.name} ·{" "}
                            {new Date(t.startDate).toLocaleDateString()}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Suspense>
                  <TournamentPagination
                    page={result.page}
                    totalPages={result.totalPages}
                    total={result.total}
                    pageParam={pageParam}
                    itemLabel="tournament"
                  />
                </Suspense>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
