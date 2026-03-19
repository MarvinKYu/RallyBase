"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  startDate: Date | string;
  location: string | null;
  organizationId: string;
  organization: { id: string; name: string };
  events: { id: string }[];
}

interface Props {
  tournaments: Tournament[];
  organizations: Organization[];
}

export default function TournamentSearchBar({ tournaments, organizations }: Props) {
  const [query, setQuery] = useState("");
  const [orgId, setOrgId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [startAfter, setStartAfter] = useState("");
  const [startBefore, setStartBefore] = useState("");

  const hasFilters = query || orgId || locationQuery || startAfter || startBefore;

  const filtered = useMemo(() => {
    if (!hasFilters) return [];
    return tournaments.filter((t) => {
      if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (orgId && t.organizationId !== orgId) return false;
      if (locationQuery && !t.location?.toLowerCase().includes(locationQuery.toLowerCase())) return false;
      const start = new Date(t.startDate);
      if (startAfter && start < new Date(startAfter)) return false;
      if (startBefore && start > new Date(startBefore)) return false;
      return true;
    });
  }, [tournaments, query, orgId, locationQuery, startAfter, startBefore, hasFilters]);

  return (
    <div className="space-y-3">
      {/* Name search */}
      <input
        type="text"
        placeholder="Search tournaments…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent"
      />

      {/* Filters row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">All orgs</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Location…"
          value={locationQuery}
          onChange={(e) => setLocationQuery(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <div>
          <label className="mb-1 block text-xs text-text-3">From</label>
          <input
            type="date"
            title="Start date from"
            value={startAfter}
            onChange={(e) => setStartAfter(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-3">To</label>
          <input
            type="date"
            title="Start date to"
            value={startBefore}
            onChange={(e) => setStartBefore(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Results */}
      {hasFilters && (
        filtered.length === 0 ? (
          <p className="text-sm text-text-2">No tournaments match your filters.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-hover"
                >
                  <div>
                    <p className="text-sm font-medium text-text-1">{t.name}</p>
                    <p className="text-xs text-text-3">
                      {t.organization.name}
                      {t.location ? ` · ${t.location}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-2">
                      {new Date(t.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-text-3">
                      {t.events.length} event{t.events.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
