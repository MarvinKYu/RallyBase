import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournaments } from "@/server/services/tournament.service";

export const metadata = { title: "Tournaments — RallyBase" };

export default async function TournamentsPage() {
  const { userId } = await auth();
  const tournaments = await getTournaments();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Tournaments</h1>
            <p className="mt-1 text-sm text-zinc-500">Browse all tournaments.</p>
          </div>
          {userId && (
            <Link
              href="/tournaments/new"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              New tournament
            </Link>
          )}
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm text-zinc-500">No tournaments yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-zinc-200">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{t.name}</p>
                    <p className="text-xs text-zinc-400">
                      {t.organization.name}
                      {t.location ? ` · ${t.location}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">
                      {new Date(t.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {t.events.length} event{t.events.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
