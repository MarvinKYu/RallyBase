"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Organization = { id: string; name: string };
type RatingCategory = { id: string; name: string };

export function PlayerSearchForm({
  organizations,
  ratingCategories,
}: {
  organizations: Organization[];
  ratingCategories: RatingCategory[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const org = searchParams.get("org") ?? "";
  const discipline = searchParams.get("discipline") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const minAge = searchParams.get("minAge") ?? "";
  const maxAge = searchParams.get("maxAge") ?? "";

  function pushParams(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    startTransition(() => {
      router.push(`/players?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="search"
          defaultValue={q}
          onChange={(e) => pushParams({ q: e.target.value })}
          placeholder="Search by name or player #…"
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-3">
            Searching…
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <select
          defaultValue={org}
          onChange={(e) => pushParams({ org: e.target.value, discipline: "" })}
          className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All orgs</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>

        <select
          defaultValue={discipline}
          onChange={(e) => pushParams({ discipline: e.target.value })}
          className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All disciplines</option>
          {ratingCategories.map((rc) => (
            <option key={rc.id} value={rc.id}>{rc.name}</option>
          ))}
        </select>

        <select
          defaultValue={gender}
          onChange={(e) => pushParams({ gender: e.target.value })}
          className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All genders</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>

        <input
          type="number"
          min={1}
          defaultValue={minAge}
          onChange={(e) => pushParams({ minAge: e.target.value })}
          placeholder="Min age"
          className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <input
          type="number"
          min={1}
          defaultValue={maxAge}
          onChange={(e) => pushParams({ maxAge: e.target.value })}
          placeholder="Max age"
          className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
}
