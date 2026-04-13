"use client";

import { useState } from "react";
import Link from "next/link";
import { RemoveEntrantButton } from "./RemoveEntrantButton";

type Entry = {
  id: string;
  playerProfileId: string;
  playerProfile: {
    displayName: string;
    playerRatings: { ratingCategoryId: string; rating: number }[];
  };
};

type SortField = "name" | "rating";
type SortDir = "asc" | "desc";

export function EntrantsList({
  entries,
  ratingCategoryId,
  eventId,
  tournamentId,
  maxParticipants,
}: {
  entries: Entry[];
  ratingCategoryId: string;
  eventId: string;
  tournamentId: string;
  maxParticipants: number | null | undefined;
}) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rating" ? "desc" : "asc");
    }
  }

  function getRating(entry: Entry): number | null {
    return (
      entry.playerProfile.playerRatings.find(
        (r) => r.ratingCategoryId === ratingCategoryId,
      )?.rating ?? null
    );
  }

  const sorted = [...entries].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") {
      return mul * a.playerProfile.displayName.localeCompare(b.playerProfile.displayName);
    }
    // rating: unrated always goes to end
    const rA = getRating(a);
    const rB = getRating(b);
    if (rA === null && rB === null) return 0;
    if (rA === null) return 1;
    if (rB === null) return -1;
    return mul * (rA - rB);
  });

  function dirLabel(field: SortField) {
    if (sortField !== field) return field === "rating" ? "↓" : "A→Z";
    if (field === "rating") return sortDir === "desc" ? "↓" : "↑";
    return sortDir === "asc" ? "A→Z" : "Z→A";
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-text-1">
          Entrants ({entries.length}
          {maxParticipants ? `/${maxParticipants}` : ""})
        </h2>
        {entries.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-3">Sort:</span>
            {(["name", "rating"] as SortField[]).map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => handleSort(field)}
                className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                  sortField === field
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-text-2 hover:border-accent hover:text-text-1"
                }`}
              >
                {field === "name" ? "Name" : "Rating"} {dirLabel(field)}
              </button>
            ))}
          </div>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-text-2">No entrants yet.</p>
      ) : (
        <div className="max-h-[520px] overflow-y-auto overflow-hidden rounded-lg border border-border">
          <ul>
            {sorted.map((entry) => {
              const rating = getRating(entry);
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
                >
                  <Link
                    href={`/profile/${entry.playerProfileId}`}
                    className="text-sm font-medium text-text-1 transition-colors hover:underline"
                  >
                    {entry.playerProfile.displayName}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-2">
                      {rating !== null ? Math.round(rating) : "Unrated"}
                    </span>
                    <RemoveEntrantButton
                      eventId={eventId}
                      tournamentId={tournamentId}
                      playerProfileId={entry.playerProfileId}
                      playerName={entry.playerProfile.displayName}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
