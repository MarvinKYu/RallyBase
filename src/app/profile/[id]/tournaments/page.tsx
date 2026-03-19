import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlayerProfile } from "@/server/services/player.service";
import { getPlayerTournamentHistory } from "@/server/services/tournament.service";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return { title: profile ? `${profile.displayName}'s Tournaments — RallyBase` : "Player not found" };
}

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In progress",
  PUBLISHED: "Upcoming",
  REGISTRATION_OPEN: "Registration open",
  COMPLETED: "Completed",
};

export default async function MyTournamentsPage({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  if (!profile) notFound();

  const tournaments = await getPlayerTournamentHistory(profile.id);

  const ongoing = tournaments.filter((t) => t.status === "IN_PROGRESS");
  const upcoming = tournaments.filter((t) => t.status === "PUBLISHED");
  const past = tournaments.filter((t) => t.status === "COMPLETED");

  const groups = [
    { label: "Ongoing", items: ongoing },
    { label: "Upcoming", items: upcoming },
    { label: "Past", items: past },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">
            {profile.displayName}&apos;s Tournaments
          </h1>
        </div>

        {tournaments.length === 0 ? (
          <p className="text-sm text-text-2">No tournaments yet.</p>
        ) : (
          groups.map(({ label, items }) =>
            items.length === 0 ? null : (
              <section key={label}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
                  {label}
                </h2>
                <ul className="overflow-hidden rounded-lg border border-border">
                  {items.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-1">{t.name}</p>
                          <p className="text-xs text-text-3">
                            {t.organization.name} ·{" "}
                            {new Date(t.startDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-text-3">
                            {t.events.map((e) => e.name).join(", ")}
                          </p>
                        </div>
                        <span className="text-xs text-text-2">
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )
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
