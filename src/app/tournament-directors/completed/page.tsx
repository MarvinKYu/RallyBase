import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMyTournaments } from "@/server/services/tournament.service";

export const metadata = { title: "Completed — Tournament Directors — RallyBase" };

export default async function TDCompletedPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const all = await getMyTournaments(userId);
  const tournaments = all.filter((t) => t.status === "COMPLETED");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">Completed</h1>
          <p className="mt-1 text-sm text-text-2">{tournaments.length} tournament{tournaments.length !== 1 ? "s" : ""}</p>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm text-text-2">No completed tournaments yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}/manage`}
                  className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-text-1">{t.name}</p>
                    <p className="text-xs text-text-3">
                      {t.organization.name} · {new Date(t.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-text-3">
                    {t.events.length} event{t.events.length !== 1 ? "s" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link href="/tournament-directors" className="text-sm text-text-2 transition-colors hover:text-text-1">
          ← Back to Tournament Directors
        </Link>
      </div>
    </main>
  );
}
