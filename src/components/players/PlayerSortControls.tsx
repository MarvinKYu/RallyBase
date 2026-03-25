"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { SortField } from "@/server/services/player.service";

const FIELD_LABELS: Record<SortField, string> = {
  rating: "Rating",
  lastName: "Last Name",
  firstName: "First Name",
};

const DIR_PARAMS: Record<SortField, string> = {
  rating: "rDir",
  lastName: "lDir",
  firstName: "fDir",
};

const DEFAULT_DIRS: Record<SortField, "asc" | "desc"> = {
  rating: "desc",
  lastName: "asc",
  firstName: "asc",
};

function dirLabel(field: SortField, dir: "asc" | "desc") {
  if (field === "rating") return dir === "desc" ? "↓" : "↑";
  return dir === "asc" ? "A→Z" : "Z→A";
}

export function PlayerSortControls({
  fields,
  defaultSort = "rating",
}: {
  fields: SortField[];
  defaultSort?: SortField;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeSort = (searchParams.get("sort") ?? defaultSort) as SortField;

  function getDir(field: SortField): "asc" | "desc" {
    const param = searchParams.get(DIR_PARAMS[field]);
    return param === "asc" || param === "desc" ? param : DEFAULT_DIRS[field];
  }

  function handleClick(field: SortField) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeSort === field) {
      params.set(DIR_PARAMS[field], getDir(field) === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", field);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-3">Sort:</span>
      {fields.map((field) => {
        const isActive = activeSort === field;
        const dir = getDir(field);
        return (
          <button
            key={field}
            onClick={() => handleClick(field)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-2 hover:border-accent hover:text-text-1"
            }`}
          >
            {FIELD_LABELS[field]} {dirLabel(field, dir)}
          </button>
        );
      })}
    </div>
  );
}
