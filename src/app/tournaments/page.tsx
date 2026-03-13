import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournaments, getTournamentsForPlayer } from "@/server/services/tournament.service";
import { getMyProfile } from "@/server/services/player.service";

export const metadata = { title: "Tournaments — RallyBase" };

function TournamentList({
  tournaments,
}: {
  tournaments: Awaited<ReturnType<typeof getTournaments>>;
}) {
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
  const [tournaments, profile] = await Promise.all([
    getTournaments(),
    userId ? getMyProfile() : null,
  ]);

  const myTournaments = profile
    ? await getTournamentsForPlayer(profile.id)
    : [];

  const myTournamentIds = new Set(myTournaments.map((t) => t.id));
  const otherTournaments = tournaments.filter((t) => !myTournamentIds.has(t.id));

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

        {/* My Tournaments */}
        {myTournaments.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
              My tournaments
            </h2>
            <TournamentList tournaments={myTournaments} />
          </section>
        )}

        {/* All Tournaments */}
        <section>
          {myTournaments.length > 0 && (
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
              All tournaments
            </h2>
          )}
          <TournamentList tournaments={otherTournaments} />
        </section>
      </div>
    </main>
  );
}
