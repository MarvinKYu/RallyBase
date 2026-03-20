"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type SerializedPlayerEventMatch = {
  id: string;
  round: number;
  status: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  player1: { id: string; displayName: string } | null;
  player2: { id: string; displayName: string } | null;
  matchGames: { gameNumber: number; player1Points: number; player2Points: number }[];
};

const MATCH_STATUS_LABEL: Record<string, string> = {
  PENDING: "Upcoming",
  IN_PROGRESS: "In progress",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  COMPLETED: "Completed",
};

export function EventPlayerMatchList({
  matches,
  viewerProfileId,
}: {
  matches: SerializedPlayerEventMatch[];
  viewerProfileId: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const inProgress = matches.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "AWAITING_CONFIRMATION",
  );
  const upcoming = matches.filter((m) => m.status === "PENDING");
  const completed = matches.filter((m) => m.status === "COMPLETED");

  const groups = [
    { label: "In progress", items: inProgress },
    { label: "Upcoming", items: upcoming },
    { label: "Completed", items: completed },
  ];

  if (matches.length === 0) {
    return <p className="text-sm text-text-2">No matches yet.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map(({ label, items }) =>
        items.length === 0 ? null : (
          <div key={label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">
              {label}
            </p>
            <ul className="overflow-hidden rounded-lg border border-border">
              {items.map((m) => {
                const opponent =
                  m.player1Id === viewerProfileId ? m.player2 : m.player1;
                const isExpanded = expanded.has(m.id);
                const hasScores = m.status === "COMPLETED" && m.matchGames.length > 0;

                const actionHref =
                  m.status === "AWAITING_CONFIRMATION"
                    ? `/matches/${m.id}/confirm`
                    : m.status === "COMPLETED"
                      ? `/matches/${m.id}`
                      : `/matches/${m.id}/submit`;
                const actionLabel =
                  m.status === "PENDING"
                    ? "Submit"
                    : m.status === "AWAITING_CONFIRMATION"
                      ? "Confirm"
                      : m.status === "IN_PROGRESS"
                        ? "Continue"
                        : "View";

                const isCompleted = m.status === "COMPLETED";
                const handleRowClick = () => {
                  if (hasScores) toggle(m.id);
                  else if (!isCompleted) router.push(actionHref);
                };
                const isClickable = hasScores || !isCompleted;

                return (
                  <li key={m.id} className="border-b border-border-subtle last:border-b-0">
                    <div
                      className={`flex items-center justify-between bg-surface px-4 py-3${isClickable ? " cursor-pointer" : ""}`}
                      onClick={isClickable ? handleRowClick : undefined}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {hasScores && (
                          <span className="shrink-0 text-xs text-text-3">
                            {isExpanded ? "▴" : "▾"}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-text-1">
                            Round {m.round} vs {opponent?.displayName ?? "TBD"}
                          </span>
                          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-3">
                            {MATCH_STATUS_LABEL[m.status] ?? m.status}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={actionHref}
                          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
                        >
                          {actionLabel}
                        </Link>
                      </div>
                    </div>

                    {isExpanded && hasScores && (
                      <div className="border-t border-border-subtle bg-elevated px-4 pb-3 pt-2">
                        <div className="space-y-1">
                          {m.matchGames.map((g) => (
                            <div
                              key={g.gameNumber}
                              className="flex items-center gap-3 text-xs"
                            >
                              <span className="w-12 text-text-3">Game {g.gameNumber}</span>
                              <span
                                className={
                                  g.player1Points > g.player2Points
                                    ? "font-medium text-text-1"
                                    : "text-text-2"
                                }
                              >
                                {g.player1Points}
                              </span>
                              <span className="text-text-3">–</span>
                              <span
                                className={
                                  g.player2Points > g.player1Points
                                    ? "font-medium text-text-1"
                                    : "text-text-2"
                                }
                              >
                                {g.player2Points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}
