import Link from "next/link";
import { findTournamentsWithEntriesByProfile } from "@/server/repositories/tournament.repository";

type Tournament = Awaited<ReturnType<typeof findTournamentsWithEntriesByProfile>>[number];

const STATUS_PILL: Record<string, string> = {
  IN_PROGRESS: "In progress",
  PUBLISHED: "Upcoming",
};

const STATUS_PILL_CLASS: Record<string, string> = {
  IN_PROGRESS: "bg-green-950/50 text-green-400",
  PUBLISHED: "bg-blue-950/50 text-blue-400",
};

interface Props {
  tournaments: Tournament[];
  profileId: string;
}

export default function MyTournamentsPreview({ tournaments, profileId }: Props) {
  const ongoing = tournaments.filter((t) => t.status === "IN_PROGRESS");
  const upcoming = tournaments.filter((t) => t.status === "PUBLISHED");

  const preview = [...ongoing, ...upcoming].slice(0, 3);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-text-1">My tournaments</h2>
        <Link
          href={`/profile/${profileId}/tournaments`}
          className="text-sm text-accent hover:underline"
        >
          View all →
        </Link>
      </div>
      {preview.length === 0 ? (
        <p className="text-sm text-text-2">No upcoming tournaments.</p>
      ) : (
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
                    {t.events.map((e) => e.name).join(", ")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL_CLASS[t.status] ?? "bg-surface text-text-3"}`}
                >
                  {STATUS_PILL[t.status] ?? t.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
