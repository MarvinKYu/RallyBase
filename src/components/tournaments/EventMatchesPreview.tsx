import Link from "next/link";
import { EventMatchRow, type SerializedEventMatch } from "./EventMatchRow";

export function EventMatchesPreview({
  matches,
  viewAllHref,
}: {
  matches: SerializedEventMatch[];
  viewAllHref: string;
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-text-2">No matches scheduled yet.</p>;
  }

  const preview = matches.slice(0, 5);

  return (
    <div className="space-y-3">
      <ul className="overflow-hidden rounded-lg border border-border">
        {preview.map((m) => (
          <EventMatchRow key={m.id} match={m} />
        ))}
      </ul>
      {matches.length > 5 && (
        <Link
          href={viewAllHref}
          className="block text-sm text-accent transition-colors hover:underline"
        >
          View all {matches.length} matches →
        </Link>
      )}
    </div>
  );
}
