import Link from "next/link";
import { getPublicTournaments, getOrganizations } from "@/server/services/tournament.service";
import TournamentSearchBar from "@/components/tournaments/TournamentSearchBar";

export const metadata = { title: "Upcoming Tournaments — RallyBase" };

export default async function UpcomingTournamentsPage() {
  const [allPublic, organizations] = await Promise.all([
    getPublicTournaments(),
    getOrganizations(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = allPublic.filter(
    (t) => new Date(t.startDate) >= today && t.status !== "COMPLETED",
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">Upcoming Tournaments</h1>
          <p className="mt-1 text-sm text-text-2">{upcoming.length} tournament{upcoming.length !== 1 ? "s" : ""}</p>
        </div>

        <TournamentSearchBar tournaments={upcoming} organizations={organizations} />

        <Link href="/tournaments" className="text-sm text-text-2 transition-colors hover:text-text-1">
          ← Back to tournaments
        </Link>
      </div>
    </main>
  );
}
