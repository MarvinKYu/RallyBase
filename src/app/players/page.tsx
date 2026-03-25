import { Suspense } from "react";
import Link from "next/link";
import { Gender } from "@prisma/client";
import { searchPlayers, type SortField, type SortDir } from "@/server/services/player.service";
import { getOrganizations, getRatingCategoriesForOrg } from "@/server/services/tournament.service";
import { PlayerSearchForm } from "@/components/players/PlayerSearchForm";
import { PlayerSortControls } from "@/components/players/PlayerSortControls";
import { PlayerPagination } from "@/components/players/PlayerPagination";

export const metadata = { title: "Find Players — RallyBase" };

type Props = {
  searchParams: Promise<{
    q?: string;
    org?: string;
    discipline?: string;
    gender?: string;
    minAge?: string;
    maxAge?: string;
    sort?: string;
    rDir?: string;
    lDir?: string;
    fDir?: string;
    page?: string;
  }>;
};

export default async function PlayersPage({ searchParams }: Props) {
  const {
    q = "",
    org = "",
    discipline = "",
    gender = "",
    minAge = "",
    maxAge = "",
    sort = "rating",
    rDir = "desc",
    lDir = "asc",
    fDir = "asc",
    page = "1",
  } = await searchParams;

  const organizations = await getOrganizations();
  const ratingCategories = org ? await getRatingCategoriesForOrg(org) : [];

  // Determine the rating category to display and sort by:
  // - Both org + discipline set → that discipline
  // - Org set, no discipline → org's Singles category (or first)
  // - Neither → USATT Singles (or first USATT category)
  let sortRatingCategoryId: string | undefined = discipline || undefined;
  if (!sortRatingCategoryId) {
    if (org) {
      sortRatingCategoryId =
        ratingCategories.find((c) => c.name.toLowerCase().includes("singles"))?.id ??
        ratingCategories[0]?.id;
    } else {
      const usattOrg = organizations.find((o) => o.name === "USATT");
      if (usattOrg) {
        const usattCategories = await getRatingCategoriesForOrg(usattOrg.id);
        sortRatingCategoryId =
          usattCategories.find((c) => c.name.toLowerCase().includes("singles"))?.id ??
          usattCategories[0]?.id;
      }
    }
  }

  const { players, total, totalPages, page: currentPage } = await searchPlayers(
    q,
    {
      organizationId: org || undefined,
      ratingCategoryId: discipline || undefined,
      gender: gender ? (gender as Gender) : undefined,
      minAge: minAge ? parseInt(minAge, 10) : undefined,
      maxAge: maxAge ? parseInt(maxAge, 10) : undefined,
    },
    {
      sort: sort as SortField,
      rDir: rDir as SortDir,
      lDir: lDir as SortDir,
      fDir: fDir as SortDir,
      page: parseInt(page, 10),
      sortRatingCategoryId,
    },
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">Find players</h1>
          <p className="mt-1 text-sm text-text-2">
            Search by display name, player number, or filter by organization.
          </p>
        </div>

        <Suspense>
          <PlayerSearchForm
            organizations={organizations}
            ratingCategories={ratingCategories}
          />
        </Suspense>

        <Suspense>
          <PlayerSortControls fields={["rating", "lastName", "firstName"]} />
        </Suspense>

        {players.length === 0 ? (
          <p className="text-sm text-text-2">
            {q || org || discipline || gender || minAge || maxAge
              ? `No players found${q ? ` for "${q}"` : ""}.`
              : "No players found."}
          </p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border">
            {players.map((p) => {
              const rating = p.playerRatings.find(
                (r) => r.ratingCategoryId === sortRatingCategoryId,
              );
              return (
                <li key={p.id}>
                  <Link
                    href={`/profile/${p.id}`}
                    className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                  >
                    <span className="text-sm font-medium text-text-1">{p.displayName}</span>
                    <span className="text-xs text-text-3">
                      {rating ? Math.round(rating.rating) : "Unrated"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Suspense>
          <PlayerPagination page={currentPage} totalPages={totalPages} total={total} />
        </Suspense>
      </div>
    </main>
  );
}
