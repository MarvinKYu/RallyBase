import { Suspense } from "react";
import Link from "next/link";
import { Gender } from "@prisma/client";
import { searchPlayers } from "@/server/services/player.service";
import { getOrganizations, getRatingCategoriesForOrg } from "@/server/services/tournament.service";
import { PlayerSearchForm } from "@/components/players/PlayerSearchForm";

export const metadata = { title: "Find Players — RallyBase" };

type Props = {
  searchParams: Promise<{
    q?: string;
    org?: string;
    discipline?: string;
    gender?: string;
    minAge?: string;
    maxAge?: string;
  }>;
};

async function Results({
  query,
  organizationId,
  ratingCategoryId,
  gender,
  minAge,
  maxAge,
  displayRatingCategoryId,
}: {
  query: string;
  organizationId?: string;
  ratingCategoryId?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  displayRatingCategoryId?: string;
}) {
  const hasFilter = !!organizationId || !!ratingCategoryId || !!gender || !!minAge || !!maxAge;

  if (!query && !hasFilter) {
    return (
      <p className="text-sm text-text-2">
        Enter a name or player # to search, or use filters above.
      </p>
    );
  }

  const players = await searchPlayers(query, {
    organizationId: organizationId || undefined,
    ratingCategoryId: ratingCategoryId || undefined,
    gender: gender ? (gender as Gender) : undefined,
    minAge,
    maxAge,
  });

  if (players.length === 0) {
    return (
      <p className="text-sm text-text-2">
        No players found{query ? ` for "${query}"` : ""}.
      </p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-border">
      {players.map((p) => {
        const rating = displayRatingCategoryId
          ? p.playerRatings.find((r) => r.ratingCategoryId === displayRatingCategoryId)
          : p.playerRatings[0];
        return (
          <li key={p.id}>
            <Link
              href={`/profile/${p.id}`}
              className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-3">#{p.playerNumber}</span>
                <span className="text-sm font-medium text-text-1">
                  {p.displayName}
                </span>
              </div>
              <span className="text-xs text-text-3">
                {rating ? Math.round(rating.rating) : "Unrated"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function PlayersPage({ searchParams }: Props) {
  const { q = "", org = "", discipline = "", gender = "", minAge = "", maxAge = "" } = await searchParams;

  const organizations = await getOrganizations();
  const ratingCategories = org ? await getRatingCategoriesForOrg(org) : [];

  // Determine which rating category to display on result cards.
  // Priority: active discipline filter → active org's first category → default org's "Singles" category
  let displayRatingCategoryId: string | undefined = discipline || undefined;
  if (!displayRatingCategoryId) {
    const contextCategories = org
      ? ratingCategories
      : await getRatingCategoriesForOrg(organizations[0]?.id ?? "");
    displayRatingCategoryId =
      contextCategories.find((c) => c.name.toLowerCase().includes("singles"))?.id ??
      contextCategories[0]?.id;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">
            Find players
          </h1>
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

        <Suspense
          fallback={<p className="text-sm text-text-3">Searching…</p>}
        >
          <Results
            query={q}
            organizationId={org || undefined}
            ratingCategoryId={discipline || undefined}
            gender={gender || undefined}
            minAge={minAge ? parseInt(minAge, 10) : undefined}
            maxAge={maxAge ? parseInt(maxAge, 10) : undefined}
            displayRatingCategoryId={displayRatingCategoryId}
          />
        </Suspense>
      </div>
    </main>
  );
}
