"use client";

import { useActionState, useState, useMemo } from "react";
import { type AdminActionState } from "@/server/actions/admin.actions";

type CategoryOption = {
  id: string;
  orgId: string;
  orgName: string;
  disciplineName: string;
};

export function AdminAddRatingForm({
  profileId,
  availableCategories,
  action,
}: {
  profileId: string;
  availableCategories: CategoryOption[];
  action: (prev: AdminActionState, fd: FormData) => Promise<AdminActionState>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [state, dispatch, isPending] = useActionState<AdminActionState, FormData>(action, null);

  const disabled = availableCategories.length === 0;

  // Group categories by org
  const orgMap = useMemo(() => {
    const map = new Map<string, { orgName: string; categories: CategoryOption[] }>();
    for (const cat of availableCategories) {
      if (!map.has(cat.orgId)) map.set(cat.orgId, { orgName: cat.orgName, categories: [] });
      map.get(cat.orgId)!.categories.push(cat);
    }
    return map;
  }, [availableCategories]);

  const orgs = useMemo(
    () => Array.from(orgMap.entries()).map(([id, v]) => ({ id, name: v.orgName })),
    [orgMap],
  );

  const singleOrg = orgs.length === 1 ? orgs[0] : null;
  const effectiveOrgId = selectedOrgId || singleOrg?.id || "";
  const disciplinesForOrg = effectiveOrgId ? (orgMap.get(effectiveOrgId)?.categories ?? []) : [];

  function handleCancel() {
    setIsOpen(false);
    setSelectedOrgId("");
  }

  return (
    <div className="rounded-lg border border-border bg-elevated p-4">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className="flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden>+</span>
          <span>Add Rating</span>
        </button>
      ) : (
        <form action={dispatch} className="space-y-3">
          <p className="text-sm font-medium text-text-1">Add Rating</p>

          {/* Org row — locked to text if only one option */}
          {singleOrg ? (
            <div>
              <p className="text-xs font-medium text-text-3 mb-1">Organization</p>
              <p className="text-sm text-text-1">{singleOrg.name}</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-text-3 mb-1">Organization</label>
              <select
                value={effectiveOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select org…</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Discipline select */}
          <div>
            <label className="block text-xs font-medium text-text-3 mb-1">Discipline</label>
            <select
              name="ratingCategoryId"
              required
              disabled={!effectiveOrgId}
              defaultValue=""
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            >
              <option value="" disabled>
                Select discipline…
              </option>
              {disciplinesForOrg.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.disciplineName}
                </option>
              ))}
            </select>
          </div>

          {/* Rating input */}
          <div>
            <label className="block text-xs font-medium text-text-3 mb-1">Initial Rating</label>
            <input
              name="rating"
              type="number"
              min="0"
              step="1"
              defaultValue={1500}
              className="w-28 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-1 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-dim disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-text-2 transition-colors hover:text-text-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
