import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  getPublicTournaments,
  getMyTournaments,
  getTournamentsForPlayer,
  getPlayerTournamentHistory,
} from "@/server/services/tournament.service";
import { getMyProfile } from "@/server/services/player.service";
import MyTournamentsPreview from "@/components/players/MyTournamentsPreview";

export const metadata = { title: "Tournaments — RallyBase" };

type Tournament = Awaited<ReturnType<typeof getPublicTournaments>>[number];

function TournamentList({ tournaments }: { tournaments: Tournament[] }) {
  if (tournaments.length === 0) {
    return <p className="text-sm text-text-2">No tournaments yet.</p>;
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-border">
      {tournaments.map((t) => (
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
  );
}

export default async function TournamentsPage() {
  const { userId } = await auth();
  const [publicTournaments, profile] = await Promise.all([
    getPublicTournaments(),
    userId ? getMyProfile() : null,
  ]);

  const [myDraftTournaments, registeredTournaments, myTournamentHistory] = await Promise.all([
    userId ? getMyTournaments(userId) : Promise.resolve([]),
    profile ? getTournamentsForPlayer(profile.id) : Promise.resolve([]),
    profile ? getPlayerTournamentHistory(profile.id) : Promise.resolve([]),
  ]);

  // Draft tournaments created by me (not yet published)
  const myDrafts = myDraftTournaments.filter((t) => t.status === "DRAFT");

  // Split public tournaments into upcoming and past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = publicTournaments.filter((t) => new Date(t.startDate) >= today);
  const past = publicTournaments.filter((t) => new Date(t.startDate) < today);

  // My registered tournaments (from public list)
  const registeredIds = new Set(registeredTournaments.map((t) => t.id));
  const myRegistered = publicTournaments.filter((t) => registeredIds.has(t.id));
  const otherUpcoming = upcoming.filter((t) => !registeredIds.has(t.id));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-1">Tournaments</h1>
            <p className="mt-1 text-sm text-text-2">Browse all tournaments.</p>
          </div>
          {userId && (
            <Link
              href="/tournaments/new"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
            >
              New tournament
            </Link>
          )}
        </div>

        {/* My Tournaments preview — logged-in players */}
        {profile && (
          <MyTournamentsPreview tournaments={myTournamentHistory} profileId={profile.id} />
        )}

        {/* My Draft Tournaments — TD only */}
        {myDrafts.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
              My drafts
            </h2>
            <ul className="overflow-hidden rounded-lg border border-border">
              {myDrafts.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tournaments/${t.id}/manage`}
                    className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-1">{t.name}</p>
                      <p className="text-xs text-text-3">
                        {t.organization.name}
                        {t.location ? ` · ${t.location}` : ""}
                        {" · "}
                        <span className="text-amber-400">Draft</span>
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
          </section>
        )}

        {/* My registered tournaments */}
        {myRegistered.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
              My tournaments
            </h2>
            <TournamentList tournaments={myRegistered} />
          </section>
        )}

        {/* Upcoming tournaments */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
            Upcoming
          </h2>
          <TournamentList tournaments={otherUpcoming} />
        </section>

        {/* Past tournaments */}
        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
              Past
            </h2>
            <TournamentList tournaments={past} />
          </section>
        )}
      </div>
    </main>
  );
}
