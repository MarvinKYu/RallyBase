"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function PlayerSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const q = searchParams.get("q") ?? "";

  function handleChange(value: string) {
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      router.push(`/players?${params.toString()}`);
    });
  }

  return (
    <div className="relative">
      <input
        type="search"
        defaultValue={q}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search by display name…"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        autoFocus
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
          Searching…
        </span>
      )}
    </div>
  );
}
