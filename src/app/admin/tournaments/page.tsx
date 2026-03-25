import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser, getTournamentCreatorNames } from "@/server/services/admin.service";
import { getTournaments } from "@/server/services/tournament.service";

export const metadata = { title: "All Tournaments — RallyBase Admin" };

const statusBadge: Record<string, string> = {
  DRAFT: "bg-surface border border-border text-text-3",
  PUBLISHED: "bg-blue-950/60 border border-blue-800 text-blue-300",
  IN_PROGRESS: "bg-amber-950/60 border border-amber-800 text-amber-300",
  COMPLETED: "bg-surface border border-border text-text-2",
};

export default async function AdminTournamentsPage() {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) notFound();

  const tournaments = await getTournaments();
  const creatorClerkIds = [...new Set(tournaments.map((t) => t.createdByClerkId).filter(Boolean) as string[])];
  const creatorNames = await getTournamentCreatorNames(creatorClerkIds);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-1">All Tournaments</h1>
            <p className="mt-0.5 text-sm text-text-3">{tournaments.length} total</p>
          </div>
          <Link href="/admin" className="text-sm text-text-2 hover:text-text-1 transition-colors">
            ← Admin
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm text-text-3">No tournaments found.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border">
            {tournaments.map((t) => (
              <li key={t.id} className="border-b border-border-subtle last:border-b-0">
                <Link
                  href={`/tournaments/${t.id}/manage?from=admin`}
                  className="flex items-center justify-between bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-1">{t.name}</p>
                    <p className="text-xs text-text-3">
                      {t.organization.name} · {new Date(t.startDate).toLocaleDateString()}
                    </p>
                    {t.createdByClerkId && creatorNames.get(t.createdByClerkId) && (
                      <p className="text-xs text-text-3">
                        TD: {creatorNames.get(t.createdByClerkId)}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span className="text-xs text-text-3">
                      {t.events.length} event{t.events.length !== 1 ? "s" : ""}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[t.status] ?? "bg-surface border border-border text-text-3"}`}
                    >
                      {t.status.replace(/_/g, " ")}
                    </span>
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
