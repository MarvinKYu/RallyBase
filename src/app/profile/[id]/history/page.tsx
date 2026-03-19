import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlayerProfile, getPlayerMatchHistory } from "@/server/services/player.service";
import MatchHistoryList from "@/components/players/MatchHistoryList";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return { title: profile ? `${profile.displayName}'s Match History — RallyBase` : "Player not found" };
}

export default async function PlayerHistoryPage({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  if (!profile) notFound();

  const matchHistory = await getPlayerMatchHistory(profile.id);

  // Group matches by tournament
  const tournamentMap = new Map<string, { name: string; matches: typeof matchHistory }>();
  for (const m of matchHistory) {
    const tid = m.event.tournament.id;
    if (!tournamentMap.has(tid)) {
      tournamentMap.set(tid, { name: m.event.tournament.name, matches: [] });
    }
    tournamentMap.get(tid)!.matches.push(m);
  }

  const tournaments = Array.from(tournamentMap.entries());

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">
            {profile.displayName}&apos;s Match History
          </h1>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm text-text-2">No match history yet.</p>
        ) : (
          tournaments.map(([tid, { name, matches }]) => (
            <section key={tid}>
              <h2 className="mb-3 text-base font-medium text-text-1">
                <Link href={`/tournaments/${tid}`} className="hover:underline">
                  {name}
                </Link>
              </h2>
              <MatchHistoryList matches={matches} playerProfileId={profile.id} />
            </section>
          ))
        )}

        <Link
          href={`/profile/${profile.id}`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to profile
        </Link>
      </div>
    </main>
  );
}
