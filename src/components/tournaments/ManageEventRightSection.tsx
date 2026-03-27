"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ManageEventMatchList, type MatchRow } from "@/components/tournaments/ManageEventMatchList";
import { getRoundLabel } from "@/lib/bracket-labels";

export type EntryCard = {
  playerProfileId: string;
  displayName: string;
  rating: number | null;
  groupNumber: number | null;
};

const GROUPS_PER_PAGE = 8; // 4 columns × 2 rows

export function ManageEventRightSection({
  matches,
  entries,
  isGrouped,
  isRRToSE,
  seExists,
  seTotalRounds,
  totalMatches,
  tournamentId,
  eventId,
  advancersPerGroup,
}: {
  matches: MatchRow[];
  entries: EntryCard[];
  isGrouped: boolean;
  isRRToSE?: boolean;
  seExists?: boolean;
  seTotalRounds?: number | null;
  totalMatches: number;
  tournamentId: string;
  eventId: string;
  advancersPerGroup?: number | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [groupsPage, setGroupsPage] = useState(() => {
    const v = parseInt(searchParams.get("gp") ?? "1", 10);
    return isNaN(v) ? 0 : Math.max(0, v - 1);
  });
  const [sortBy, setSortBy] = useState<"group" | "round">(() => {
    const v = searchParams.get("sort");
    if (v === "group" || v === "round") return v;
    return isGrouped ? "group" : "round";
  });
  // For RR→SE events with SE stage generated: which phase to display
  const [phase, setPhase] = useState<"rr" | "se">(() => {
    const v = searchParams.get("phase");
    return v === "se" ? "se" : "rr";
  });
  const [matchPage, setMatchPage] = useState(() => {
    const v = parseInt(searchParams.get("mp") ?? "1", 10);
    return isNaN(v) ? 0 : Math.max(0, v - 1);
  });
  const jumpRef = useRef<HTMLInputElement>(null);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null) params.delete(key);
        else params.set(key, val);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const showSEPhase = isRRToSE && seExists;

  // ── Groups data ──────────────────────────────────────────────────────────────

  const groups = useMemo(() => {
    if (!isGrouped) return [];
    const groupNums = [
      ...new Set(
        entries
          .map((e) => e.groupNumber)
          .filter((g): g is number => g !== null),
      ),
    ].sort((a, b) => a - b);

    return groupNums.map((groupNum) => {
      const groupEntries = entries.filter((e) => e.groupNumber === groupNum);
      const allGroupMatches = matches.filter((m) => m.groupNumber === groupNum);
      const completedGroupMatches = allGroupMatches.filter((m) => m.status === "COMPLETED");
      const groupComplete =
        allGroupMatches.length > 0 && allGroupMatches.length === completedGroupMatches.length;

      const wl = new Map<string, { wins: number; losses: number }>();
      for (const e of groupEntries) wl.set(e.playerProfileId, { wins: 0, losses: 0 });
      for (const m of completedGroupMatches) {
        if (!m.winnerId || !m.player1Id || !m.player2Id) continue;
        const p1 = wl.get(m.player1Id);
        const p2 = wl.get(m.player2Id);
        if (m.winnerId === m.player1Id) {
          if (p1) p1.wins++;
          if (p2) p2.losses++;
        } else {
          if (p2) p2.wins++;
          if (p1) p1.losses++;
        }
      }

      const rawPlayers = groupEntries.map((e) => ({
        ...e,
        wins: wl.get(e.playerProfileId)?.wins ?? 0,
        losses: wl.get(e.playerProfileId)?.losses ?? 0,
      }));

      const sortedPlayers = groupComplete
        ? [...rawPlayers].sort((a, b) => b.wins - a.wins)
        : rawPlayers;

      // Assign ranks (competition ranking: ties share rank)
      const rankList: number[] = [];
      if (groupComplete) {
        for (let i = 0; i < sortedPlayers.length; i++) {
          if (i === 0) {
            rankList.push(1);
          } else if (sortedPlayers[i].wins === sortedPlayers[i - 1].wins) {
            rankList.push(rankList[i - 1]);
          } else {
            rankList.push(i + 1);
          }
        }
      }

      return {
        groupNumber: groupNum,
        groupComplete,
        players: sortedPlayers.map((p, i) => ({
          ...p,
          rank: groupComplete ? rankList[i] : null,
        })),
      };
    });
  }, [isGrouped, entries, matches]);

  const totalGroupPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  const visibleGroups = groups.slice(
    groupsPage * GROUPS_PER_PAGE,
    (groupsPage + 1) * GROUPS_PER_PAGE,
  );

  // ── Match pages ──────────────────────────────────────────────────────────────

  const matchPages = useMemo(() => {
    // RR→SE SE phase: SE matches (groupNumber === null) with round labels
    if (showSEPhase && phase === "se") {
      const seMatches = matches.filter((m) => m.groupNumber === null);
      const rounds = [...new Set(seMatches.map((m) => m.round))].sort((a, b) => a - b);
      const totalRounds = seTotalRounds ?? Math.max(...rounds, 1);
      return rounds.map((r) => ({
        label: getRoundLabel(r, totalRounds),
        matches: seMatches.filter((m) => m.round === r),
      }));
    }

    // RR phase (or pure RR/SE): filter to RR matches only when in hybrid mode
    const activeMatches =
      isRRToSE ? matches.filter((m) => m.groupNumber !== null) : matches;

    if (sortBy === "group" && isGrouped) {
      const groupNums = [
        ...new Set(
          activeMatches
            .map((m) => m.groupNumber)
            .filter((g): g is number => g !== null),
        ),
      ].sort((a, b) => a - b);
      return groupNums.map((gNum) => ({
        label: `Group ${gNum}`,
        matches: activeMatches.filter((m) => m.groupNumber === gNum),
      }));
    }
    // By round — SE events get proper labels; RR "by round" keeps "Round N"
    const rounds = [...new Set(activeMatches.map((m) => m.round))].sort((a, b) => a - b);
    const totalRounds = !isGrouped && rounds.length > 0 ? Math.max(...rounds) : null;
    return rounds.map((r) => ({
      label: totalRounds !== null ? getRoundLabel(r, totalRounds) : `Round ${r}`,
      matches: activeMatches.filter((m) => m.round === r),
    }));
  }, [sortBy, isGrouped, matches, showSEPhase, phase, isRRToSE, seTotalRounds]);

  const totalMatchPages = matchPages.length;
  const safeMatchPage = Math.min(matchPage, Math.max(0, totalMatchPages - 1));
  const currentMatchPage = matchPages[safeMatchPage] ?? null;

  function handleSortChange(next: "group" | "round") {
    setSortBy(next);
    setMatchPage(0);
    if (jumpRef.current) jumpRef.current.value = "";
    updateUrl({ sort: next, mp: null });
  }

  function handlePhaseChange(next: "rr" | "se") {
    setPhase(next);
    setMatchPage(0);
    if (jumpRef.current) jumpRef.current.value = "";
    updateUrl({ phase: next === "rr" ? null : next, mp: null });
  }

  function jumpToPage(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalMatchPages) {
      setMatchPage(n - 1);
      if (jumpRef.current) jumpRef.current.value = "";
      updateUrl({ mp: String(n) });
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Groups section ──────────────────────────────────────────────────── */}
      {isGrouped && groups.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-medium text-text-1">Groups</h2>
            {seExists && (
              <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-2">
                Completed
              </span>
            )}
          </div>

          {/* 4-column grid, max 2 rows per page */}
          <div className="grid grid-cols-4 gap-3">
            {visibleGroups.map((group) => (
              <div
                key={group.groupNumber}
                className="rounded-lg border border-border bg-surface p-3"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">
                  Group {group.groupNumber}
                </p>
                <table className="w-full">
                  <thead>
                    <tr>
                      {group.groupComplete && (
                        <th className="pb-1 w-4 text-left text-xs font-medium text-text-3">#</th>
                      )}
                      <th className="pb-1 text-left text-xs font-medium text-text-3">Player</th>
                      <th className="pb-1 text-right text-xs font-medium text-text-3">Rtg</th>
                      <th className="pb-1 text-right text-xs font-medium text-text-3 whitespace-nowrap">W-L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.players.map((p) => {
                      const rank = p.rank;
                      const isAdvancer = !!advancersPerGroup && rank !== null && rank <= advancersPerGroup;
                      const rankColor =
                        rank === 1
                          ? "text-amber-400"
                          : rank === 2
                            ? "text-gray-400"
                            : rank === 3
                              ? "text-orange-500"
                              : "text-text-3";
                      return (
                        <tr key={p.playerProfileId}>
                          {group.groupComplete && (
                            <td className={`py-0.5 pr-1 text-xs ${rankColor} ${isAdvancer ? "font-bold" : ""}`}>
                              {rank}
                            </td>
                          )}
                          <td className="py-0.5 pr-2 text-xs text-text-1 truncate max-w-0 w-full">
                            {p.displayName}
                          </td>
                          <td className="py-0.5 pr-2 text-right text-xs text-text-3">
                            {p.rating !== null ? Math.round(p.rating) : "—"}
                          </td>
                          <td className={`py-0.5 text-right text-xs whitespace-nowrap ${isAdvancer ? "font-semibold text-text-1" : "text-text-2"}`}>
                            {p.wins}-{p.losses}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Groups pagination — only when > 8 groups */}
          {totalGroupPages > 1 && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => {
                  const next = Math.max(0, groupsPage - 1);
                  setGroupsPage(next);
                  updateUrl({ gp: next === 0 ? null : String(next + 1) });
                }}
                disabled={groupsPage === 0}
                className="rounded-md border border-border px-2 py-1 text-xs text-text-2 transition-colors hover:border-accent hover:text-text-1 disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-xs text-text-3">
                Page {groupsPage + 1} of {totalGroupPages}
              </span>
              <button
                onClick={() => {
                  const next = Math.min(totalGroupPages - 1, groupsPage + 1);
                  setGroupsPage(next);
                  updateUrl({ gp: String(next + 1) });
                }}
                disabled={groupsPage === totalGroupPages - 1}
                className="rounded-md border border-border px-2 py-1 text-xs text-text-2 transition-colors hover:border-accent hover:text-text-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Matches section ─────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-medium text-text-1">
            Matches ({totalMatches})
          </h2>
          <div className="flex items-center gap-2">
            {/* Phase toggle — RR→SE events with SE stage generated */}
            {showSEPhase && (
              <select
                value={phase}
                onChange={(e) => handlePhaseChange(e.target.value as "rr" | "se")}
                className="rounded-md border border-border bg-elevated px-2 py-1 text-xs text-text-1 focus:border-accent focus:outline-none"
              >
                <option value="rr">RR Phase</option>
                <option value="se">Bracket Phase</option>
              </select>
            )}
            {/* Sort by — only for RR phase (grouped events, not SE phase) */}
            {isGrouped && (!showSEPhase || phase === "rr") && (
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as "group" | "round")}
                className="rounded-md border border-border bg-elevated px-2 py-1 text-xs text-text-1 focus:border-accent focus:outline-none"
              >
                <option value="group">By group</option>
                <option value="round">By round</option>
              </select>
            )}
          </div>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-text-2">No bracket generated yet.</p>
        ) : (
          <>
            {currentMatchPage && (
              <div className="overflow-hidden rounded-lg border border-border">
                <ManageEventMatchList
                  matches={currentMatchPage.matches}
                  tournamentId={tournamentId}
                  eventId={eventId}
                />
              </div>
            )}

            {/* Match pagination */}
            {totalMatchPages > 1 && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    const next = Math.max(0, safeMatchPage - 1);
                    setMatchPage(next);
                    if (jumpRef.current) jumpRef.current.value = "";
                    updateUrl({ mp: next === 0 ? null : String(next + 1) });
                  }}
                  disabled={safeMatchPage === 0}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-2 transition-colors hover:border-accent hover:text-text-1 disabled:opacity-40"
                >
                  ←
                </button>

                <span className="text-xs text-text-2">
                  <span className="font-medium text-text-1">{currentMatchPage?.label}</span>
                  {" · "}
                  {safeMatchPage + 1} / {totalMatchPages}
                </span>

                <button
                  onClick={() => {
                    const next = Math.min(totalMatchPages - 1, safeMatchPage + 1);
                    setMatchPage(next);
                    if (jumpRef.current) jumpRef.current.value = "";
                    updateUrl({ mp: String(next + 1) });
                  }}
                  disabled={safeMatchPage === totalMatchPages - 1}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-2 transition-colors hover:border-accent hover:text-text-1 disabled:opacity-40"
                >
                  →
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-3">Jump to:</span>
                  <input
                    ref={jumpRef}
                    type="number"
                    min={1}
                    max={totalMatchPages}
                    placeholder="—"
                    className="w-14 rounded-md border border-border bg-elevated px-2 py-1 text-center text-xs text-text-1 placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        jumpToPage((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
