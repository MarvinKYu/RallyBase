import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  getPublicTournaments,
  getOrganizations,
  getPlayerTournamentHistory,
} from "@/server/services/tournament.service";
import { getMyProfile } from "@/server/services/player.service";
import MyTournamentsPreview from "@/components/players/MyTournamentsPreview";
import TournamentSearchBar from "@/components/tournaments/TournamentSearchBar";

export const metadata = { title: "Tournaments — RallyBase" };

type Tournament = Awaited<ReturnType<typeof getPublicTournaments>>[number];

function TournamentPreviewList({
  tournaments,
  viewAllHref,
  viewAllLabel,
}: {
  tournaments: Tournament[];
  viewAllHref: string;
  viewAllLabel: string;
}) {
  const preview = tournaments.slice(0, 5);
  return (
    <>
      {preview.length === 0 ? (
        <p className="text-sm text-text-2">None yet.</p>
      ) : (
        <>
          <ul className="overflow-hidden rounded-lg border border-border">
            {preview.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-text-1">{t.name}</p>
                    <p className="text-xs text-text-3">
                      {t.organization.name}
                      {t.location ? ` · ${t.location}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
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
          {tournaments.length > 5 && (
            <Link
              href={viewAllHref}
              className="mt-2 block text-sm text-accent hover:underline"
            >
              {viewAllLabel} ({tournaments.length}) →
            </Link>
          )}
        </>
      )}
    </>
  );
}

export default async function TournamentsPage() {
  const { userId } = await auth();

  const [publicTournaments, organizations, profile] = await Promise.all([
    getPublicTournaments(),
    getOrganizations(),
    userId ? getMyProfile() : null,
  ]);

  const myTournamentHistory = profile
    ? await getPlayerTournamentHistory(profile.id)
    : [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const upcoming = publicTournaments.filter(
    (t) => new Date(t.startDate) >= today && t.status !== "COMPLETED",
  );
  const past = publicTournaments.filter(
    (t) => new Date(t.startDate) < today || t.status === "COMPLETED",
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[420px_1fr]">

        {/* Left column */}
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-text-1">Tournaments</h1>
              <p className="mt-1 text-sm text-text-2">Browse all public tournaments.</p>
            </div>
            {userId && (
              <Link
                href="/tournaments/new"
                className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
              >
                New tournament
              </Link>
            )}
          </div>

          {/* My Tournaments preview (logged-in players) */}
          {profile && (
            <MyTournamentsPreview tournaments={myTournamentHistory} profileId={profile.id} />
          )}

          {/* Tournament search */}
          <section>
            <h2 className="mb-3 text-lg font-medium text-text-1">Search</h2>
            <TournamentSearchBar
              tournaments={publicTournaments}
              organizations={organizations}
            />
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-1">Upcoming</h2>
              {upcoming.length > 5 && (
                <Link href="/tournaments/upcoming" className="text-sm text-accent hover:underline">
                  View all →
                </Link>
              )}
            </div>
            <TournamentPreviewList
              tournaments={upcoming}
              viewAllHref="/tournaments/upcoming"
              viewAllLabel="View all upcoming"
            />
          </section>

          {past.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium text-text-1">Past</h2>
                {past.length > 5 && (
                  <Link href="/tournaments/past" className="text-sm text-accent hover:underline">
                    View all →
                  </Link>
                )}
              </div>
              <TournamentPreviewList
                tournaments={past}
                viewAllHref="/tournaments/past"
                viewAllLabel="View all past"
              />
            </section>
          )}
        </div>

      </div>
    </main>
  );
}
