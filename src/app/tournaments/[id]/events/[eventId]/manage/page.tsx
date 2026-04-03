import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import type { EventStatus } from "@prisma/client";
import { getEventManageDetail } from "@/server/services/tournament.service";
import {
  bracketExists,
  getEventPodium,
  checkSEStageStatus,
} from "@/server/services/bracket.service";
import {
  generateBracketAction,
  generateSEStageAction,
  regenerateSEStageAction,
} from "@/server/actions/bracket.actions";
import { DeleteEventButton } from "@/components/tournaments/DeleteEventButton";
import { AdvanceEventStatusButton } from "@/components/tournaments/AdvanceEventStatusButton";
import { ManageEventRightSection } from "@/components/tournaments/ManageEventRightSection";
import { TieResolutionPanel } from "@/components/tournaments/TieResolutionPanel";
import type { MatchRow } from "@/components/tournaments/ManageEventMatchList";
import type { EntryCard } from "@/components/tournaments/ManageEventRightSection";

type Props = { params: Promise<{ id: string; eventId: string }> };

export async function generateMetadata({ params }: Props) {
  const { id, eventId } = await params;
  const { userId } = await auth();
  if (!userId) return { title: "Manage Event — RallyBase" };
  const event = await getEventManageDetail(eventId, userId);
  return { title: event ? `Manage ${event.name} — RallyBase` : "Event not found" };
}

const FORMAT_LABEL: Record<string, string> = {
  BEST_OF_3: "Best of 3",
  BEST_OF_5: "Best of 5",
  BEST_OF_7: "Best of 7",
};

const EVENT_ADVANCE_LABELS: Partial<Record<EventStatus, string>> = {
  DRAFT: "Open Registration",
  REGISTRATION_OPEN: "Start Event",
  IN_PROGRESS: "Complete Event",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  DRAFT: "bg-surface border border-border text-text-3",
  REGISTRATION_OPEN: "bg-green-950/60 border border-green-800 text-green-300",
  IN_PROGRESS: "bg-amber-950/60 border border-amber-800 text-amber-300",
  COMPLETED: "bg-surface border border-border text-text-2",
};


export default async function ManageEventPage({ params }: Props) {
  const { id, eventId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [event, hasBracket] = await Promise.all([
    getEventManageDetail(eventId, userId),
    bracketExists(eventId),
  ]);
  if (!event) notFound();

  const isRoundRobin = event.eventFormat === "ROUND_ROBIN";
  const isRRToSE = event.eventFormat === "RR_TO_SE";
  const isGroupBased = isRoundRobin || isRRToSE;

  const [podium, seStatus] = await Promise.all([
    event.status === "COMPLETED"
      ? getEventPodium(eventId, event.eventFormat, event.groupSize)
      : null,
    isRRToSE ? checkSEStageStatus(eventId) : null,
  ]);
  const totalMatches = event.matches.length;
  const completedMatches = event.matches.filter((m) => m.status === "COMPLETED").length;
  const progressPct = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  // For RR_TO_SE: split progress into group stage + bracket stage
  const rrMatches = isRRToSE ? event.matches.filter((m) => m.groupNumber !== null) : [];
  const seMatchesForProgress = isRRToSE ? event.matches.filter((m) => m.groupNumber === null) : [];
  const rrCompleted = rrMatches.filter((m) => m.status === "COMPLETED").length;
  const seCompletedCount = seMatchesForProgress.filter((m) => m.status === "COMPLETED").length;
  const rrPct = rrMatches.length > 0 ? Math.round((rrCompleted / rrMatches.length) * 100) : 0;
  const sePct = seMatchesForProgress.length > 0 ? Math.round((seCompletedCount / seMatchesForProgress.length) * 100) : 0;

  const serializedMatches: MatchRow[] = event.matches.map((m) => ({
    id: m.id,
    round: m.round,
    groupNumber: m.groupNumber ?? null,
    status: m.status,
    isDefault: m.isDefault,
    player1Id: m.player1Id,
    player2Id: m.player2Id,
    winnerId: m.winnerId,
    player1: m.player1 ? { id: m.player1.id, displayName: m.player1.displayName } : null,
    player2: m.player2 ? { id: m.player2.id, displayName: m.player2.displayName } : null,
    matchGames: m.matchGames.map((g) => ({
      gameNumber: g.gameNumber,
      player1Points: g.player1Points,
      player2Points: g.player2Points,
    })),
  }));

  const serializedEntries: EntryCard[] = event.eventEntries.map((e) => {
    const liveRating = e.playerProfile.playerRatings.find(
      (r) => r.ratingCategoryId === event.ratingCategoryId,
    )?.rating ?? null;
    return {
      playerProfileId: e.playerProfileId,
      displayName: e.playerProfile.displayName,
      ratingSnapshot: e.ratingSnapshot ?? null,
      rating: e.ratingSnapshot ?? liveRating,
      groupNumber: e.groupNumber ?? null,
    };
  });

  const statusBadgeClass = STATUS_BADGE_CLASSES[event.status] ?? "bg-surface border border-border text-text-3";
  const statusLabel = event.status.replace(/_/g, " ");

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Breadcrumb */}
          <p className="text-sm text-text-3">
            <Link
              href={`/tournaments/${id}/manage`}
              className="transition-colors hover:text-text-2"
            >
              {event.tournament.name}
            </Link>
          </p>

          {/* Event name + Edit / Delete */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold leading-tight text-text-1">
              {event.name}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/tournaments/${id}/events/${eventId}/edit`}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:border-accent hover:text-text-1"
              >
                Edit
              </Link>
              <DeleteEventButton eventId={eventId} tournamentId={id} />
            </div>
          </div>

          {/* Org / format details */}
          <div className="space-y-0.5 text-sm text-text-2">
            <p>
              {event.ratingCategory.organization.name} · {event.ratingCategory.name}
            </p>
            <p>
              {isRoundRobin
                ? "Round Robin"
                : isRRToSE
                  ? "Round Robin → Single Elimination"
                  : "Single Elimination"}{" "}
              · {FORMAT_LABEL[event.format] ?? event.format} · First to{" "}
              {event.gamePointTarget}
            </p>
          </div>

          {/* Bracket / standings links */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View groups — RR and RR_TO_SE (once RR matches exist) */}
            {(isRoundRobin || (isRRToSE && hasBracket)) && (
              <Link
                href={`/tournaments/${id}/events/${eventId}/standings?from=manage`}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
              >
                View groups
              </Link>
            )}
            {/* View bracket — pure SE or RR_TO_SE SE stage */}
            {((hasBracket && !isRoundRobin) || seStatus?.seExists) && (
              <Link
                href={`/tournaments/${id}/events/${eventId}/bracket?from=manage`}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
              >
                View bracket
              </Link>
            )}
          </div>

          {/* Results (completed events only) */}
          {podium?.first && (
            <section>
              <h2 className="mb-3 text-base font-medium text-text-1">Results</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-6 shrink-0 text-xs text-text-3">1st</span>
                  <Link
                    href={`/profile/${podium.first.id}`}
                    className="font-medium text-text-1 transition-colors hover:underline"
                  >
                    {podium.first.displayName}
                  </Link>
                </div>
                {podium.second && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-6 shrink-0 text-xs text-text-3">2nd</span>
                    <Link
                      href={`/profile/${podium.second.id}`}
                      className="text-text-2 transition-colors hover:underline"
                    >
                      {podium.second.displayName}
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Status + advance button */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass}`}
            >
              {statusLabel}
            </span>
            {EVENT_ADVANCE_LABELS[event.status as EventStatus] && (
              <AdvanceEventStatusButton
                eventId={eventId}
                tournamentId={id}
                label={EVENT_ADVANCE_LABELS[event.status as EventStatus]!}
              />
            )}
          </div>

          {/* Progress bar */}
          {isRRToSE ? (
            rrMatches.length > 0 && (
              <div className="flex flex-col gap-2">
                <div>
                  <p className="mb-1.5 text-xs text-text-3">Group stage progress</p>
                  <div className="group relative">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${rrPct}%` }}
                      />
                    </div>
                    <div className="absolute bottom-full left-0 mb-2 hidden whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs text-text-1 shadow group-hover:block">
                      {rrCompleted} / {rrMatches.length} group matches completed
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-text-3">Bracket stage progress</p>
                  {seMatchesForProgress.length > 0 ? (
                    <div className="group relative">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${sePct}%` }}
                        />
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 hidden whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs text-text-1 shadow group-hover:block">
                        {seCompletedCount} / {seMatchesForProgress.length} bracket matches completed
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-3">Not started</p>
                  )}
                </div>
              </div>
            )
          ) : (
            totalMatches > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-text-3">Event progress</p>
                <div className="group relative">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="absolute bottom-full left-0 mb-2 hidden whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs text-text-1 shadow group-hover:block">
                    {completedMatches} / {totalMatches} matches completed
                  </div>
                </div>
              </div>
            )
          )}

          {/* Generate schedule / bracket */}
          {!hasBracket && event.eventEntries.length >= (isGroupBased ? 3 : 2) && (
            <form action={generateBracketAction.bind(null, eventId, id)}>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
              >
                {isGroupBased ? "Generate schedule" : "Generate bracket"}
              </button>
            </form>
          )}

          {/* RR → SE: tie resolution */}
          {isRRToSE && seStatus?.ties && (
            <TieResolutionPanel
              ties={seStatus.ties}
              eventId={eventId}
              tournamentId={id}
            />
          )}

          {/* RR → SE: generate SE bracket (RR complete, no ties, SE not yet generated) */}
          {isRRToSE && hasBracket && !seStatus?.seExists && seStatus?.rrComplete && !seStatus?.ties && (
            <form action={generateSEStageAction.bind(null, eventId, id)}>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
              >
                Start bracket
              </button>
            </form>
          )}

          {/* RR → SE: re-generate SE bracket (only if no SE matches played yet) */}
          {isRRToSE && seStatus?.seCanRegenerate && (
            <form action={regenerateSEStageAction.bind(null, eventId, id)}>
              <button
                type="submit"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-2 transition-colors hover:border-accent hover:text-text-1"
              >
                Re-generate bracket
              </button>
            </form>
          )}

          {/* Entrants preview */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-medium text-text-1">
                Entrants ({event.eventEntries.length}
                {event.maxParticipants ? `/${event.maxParticipants}` : ""})
              </h2>
              <Link
                href={`/tournaments/${id}/events/${eventId}/manage/entrants`}
                className="text-sm text-accent hover:underline"
              >
                Manage →
              </Link>
            </div>
            {event.eventEntries.length === 0 ? (
              <p className="text-sm text-text-2">No entrants yet.</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-border">
                {event.eventEntries.slice(0, 10).map((entry) => {
                  const liveRating = entry.playerProfile.playerRatings.find(
                    (r) => r.ratingCategoryId === event.ratingCategoryId,
                  )?.rating ?? null;
                  const rating = entry.ratingSnapshot ?? liveRating;
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-2.5 last:border-b-0"
                    >
                      <Link
                        href={`/profile/${entry.playerProfileId}`}
                        className="text-sm text-text-1 transition-colors hover:underline"
                      >
                        {entry.playerProfile.displayName}
                      </Link>
                      <span className="text-sm text-text-2">
                        {rating !== null ? Math.round(rating) : "Unrated"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ── Right column ── */}
        <div>
          <Suspense>
            <ManageEventRightSection
              matches={serializedMatches}
              entries={serializedEntries}
              isGrouped={!!event.groupSize}
              isRRToSE={isRRToSE}
              seExists={seStatus?.seExists}
              seTotalRounds={seStatus?.seTotalRounds}
              totalMatches={totalMatches}
              tournamentId={id}
              eventId={eventId}
              advancersPerGroup={event.advancersPerGroup ?? null}
            />
          </Suspense>
        </div>

      </div>

      <div className="mt-8">
        <Link
          href={`/tournaments/${id}/manage`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to manage tournament
        </Link>
      </div>
    </main>
  );
}
