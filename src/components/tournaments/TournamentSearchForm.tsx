"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Organization = { id: string; name: string };

export function TournamentSearchForm({
  organizations,
  pageParams = ["page"],
  hideOrgFilter = false,
}: {
  organizations: Organization[];
  pageParams?: string[];
  hideOrgFilter?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const org = searchParams.get("org") ?? "";
  const loc = searchParams.get("loc") ?? "";
  const after = searchParams.get("after") ?? "";
  const before = searchParams.get("before") ?? "";

  function pushParams(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    for (const p of pageParams) params.set(p, "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search tournaments…"
        defaultValue={q}
        onChange={(e) => pushParams({ q: e.target.value })}
        className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="grid grid-cols-2 gap-2">
        {!hideOrgFilter && (
          <select
            defaultValue={org}
            onChange={(e) => pushParams({ org: e.target.value })}
            className="rounded-md border border-border bg-elevated px-2 py-1.5 text-sm text-text-1 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All orgs</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Location…"
          defaultValue={loc}
          onChange={(e) => pushParams({ loc: e.target.value })}
          className="rounded-md border border-border bg-elevated px-2 py-1.5 text-sm text-text-1 placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div>
          <label className="mb-1 block text-xs text-text-3">From</label>
          <input
            type="date"
            defaultValue={after}
            onChange={(e) => pushParams({ after: e.target.value })}
            className="w-full rounded-md border border-border bg-elevated px-2 py-1.5 text-sm text-text-1 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-3">To</label>
          <input
            type="date"
            defaultValue={before}
            onChange={(e) => pushParams({ before: e.target.value })}
            className="w-full rounded-md border border-border bg-elevated px-2 py-1.5 text-sm text-text-1 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
    </div>
  );
}
