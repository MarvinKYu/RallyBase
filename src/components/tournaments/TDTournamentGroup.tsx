import Link from "next/link";
import { findTournamentsByCreator } from "@/server/repositories/tournament.repository";

type Tournament = Awaited<ReturnType<typeof findTournamentsByCreator>>[number];

interface Props {
  label: string;
  tournaments: Tournament[];
  viewAllHref: string;
}

export default function TDTournamentGroup({ label, tournaments, viewAllHref }: Props) {
  const preview = tournaments.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-3">{label}</h2>
        <Link href={viewAllHref} className="text-xs text-accent hover:underline">
          View all →
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="text-sm text-text-2">None.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border">
          {preview.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tournaments/${t.id}/manage`}
                className="flex flex-col gap-0.5 border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
              >
                <p className="text-sm font-medium text-text-1 leading-snug">{t.name}</p>
                <p className="text-xs text-text-3">
                  {t.organization.name} · {new Date(t.startDate).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
