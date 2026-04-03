import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { MatchStatus } from "@prisma/client";
import { getPlayerProfile, getPlayerMatchHistory } from "@/server/services/player.service";
import { getPlayerRatingHistories } from "@/server/services/rating.service";
import { getPlayerTournamentHistory } from "@/server/services/tournament.service";
import MatchHistoryList from "@/components/players/MatchHistoryList";
import RatingGraph from "@/components/players/RatingGraph";
import MyTournamentsPreview from "@/components/players/MyTournamentsPreview";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return { title: profile ? `${profile.displayName} — RallyBase` : "Player not found" };
}

function computeAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

const STATUS_PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0,
  AWAITING_CONFIRMATION: 1,
  PENDING: 2,
};

function ratingDisplayPriority(name: string): number {
  return name === "RallyBase Singles" ? 0 : 1;
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  const profile = await getPlayerProfile(id);
  if (!profile) notFound();

  const isOwnProfile = !!userId && profile.user.clerkId === userId;

  const upcomingMatches = isOwnProfile
    ? await prisma.match.findMany({
        where: {
          OR: [{ player1Id: profile.id }, { player2Id: profile.id }],
          status: {
            in: [
              MatchStatus.PENDING,
              MatchStatus.IN_PROGRESS,
              MatchStatus.AWAITING_CONFIRMATION,
            ],
          },
          event: { tournament: { status: { not: "DRAFT" } } },
        },
        include: {
          player1: { select: { id: true, displayName: true } },
          player2: { select: { id: true, displayName: true } },
          event: {
            select: {
              id: true,
              name: true,
              tournament: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const top5 = [...upcomingMatches]
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))
    .slice(0, 5);

  const [matchHistory, ratingHistories, tournamentHistory] = await Promise.all([
    getPlayerMatchHistory(profile.id),
    getPlayerRatingHistories(profile.id),
    isOwnProfile ? getPlayerTournamentHistory(profile.id) : Promise.resolve([]),
  ]);
  const sortedRatings = [...profile.playerRatings].sort((a, b) => {
    const priorityDiff = ratingDisplayPriority(a.ratingCategory.name) - ratingDisplayPriority(b.ratingCategory.name);
    if (priorityDiff !== 0) return priorityDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const statusLabel: Record<string, string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In progress",
    AWAITING_CONFIRMATION: "Awaiting confirmation",
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
        {/* Left column */}
        <div className="space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h1 className="text-3xl font-semibold text-text-1">
                  {profile.displayName}
                </h1>
                <span className="text-sm text-text-3">#{profile.playerNumber}</span>
              </div>
              {(profile.showGender || profile.showAge) && (
                <div className="shrink-0 text-right text-sm text-text-3">
                  {profile.showGender && profile.gender && (
                    <p>
                      {profile.gender === "MALE" ? "Male"
                        : profile.gender === "FEMALE" ? "Female"
                        : profile.gender === "OTHER" ? "Other"
                        : "Prefer not to say"}
                    </p>
                  )}
                  {profile.showAge && profile.birthDate && (
                    <p>Age {computeAge(profile.birthDate)}</p>
                  )}
                </div>
              )}
            </div>
            {profile.bio && (
              <p className="mt-2 text-text-2">{profile.bio}</p>
            )}
            {isOwnProfile && (
              <Link
                href={`/profile/${profile.id}/edit`}
                className="mt-2 inline-block text-xs text-accent hover:text-accent-dim"
              >
                Edit profile
              </Link>
            )}
          </div>

          {/* Ratings */}
          <section>
            <h2 className="mb-4 text-lg font-medium text-text-1">Ratings</h2>
            {profile.playerRatings.length === 0 ? (
              <p className="text-sm text-text-2">
                No ratings yet. Enter a tournament to get started.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                {sortedRatings.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-1">
                        {pr.ratingCategory.name}
                      </p>
                      <p className="text-xs text-text-3">
                        {pr.ratingCategory.organization.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-accent">
                        {Math.round(pr.rating)}
                      </p>
                      <p className="text-xs text-text-3">
                        {pr.gamesPlayed} game{pr.gamesPlayed !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My Tournaments preview (own profile only) */}
          {isOwnProfile && (
            <MyTournamentsPreview tournaments={tournamentHistory} profileId={profile.id} />
          )}

          {/* Upcoming matches (own profile only) */}
          {isOwnProfile && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-text-1">Upcoming matches</h2>
                <Link
                  href={`/profile/${profile.id}/tournaments`}
                  className="text-sm text-accent hover:underline"
                >
                  View all →
                </Link>
              </div>
              {top5.length === 0 ? (
                <p className="text-sm text-text-2">No upcoming matches.</p>
              ) : (
                <ul className="overflow-hidden rounded-lg border border-border">
                  {top5.map((m) => {
                    const opponent = m.player1Id === profile.id ? m.player2 : m.player1;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-1">
                            vs {opponent?.displayName ?? "TBD"}
                          </p>
                          <p className="text-xs text-text-3">
                            {m.event.tournament.name} · {m.event.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-3">
                            {statusLabel[m.status] ?? m.status}
                          </span>
                          <Link
                            href={
                              m.status === "AWAITING_CONFIRMATION"
                                ? `/matches/${m.id}/confirm`
                                : `/matches/${m.id}/submit`
                            }
                            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-accent-dim"
                          >
                            {m.status === "AWAITING_CONFIRMATION" ? "Confirm" : "Submit"}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Rating History */}
          <section>
            <h2 className="mb-4 text-lg font-medium text-text-1">Rating history</h2>
            <RatingGraph transactions={ratingHistories} />
          </section>

          {/* Match History */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-1">Match history</h2>
              <Link
                href={`/profile/${profile.id}/history`}
                className="text-sm text-accent hover:underline"
              >
                View full history →
              </Link>
            </div>
            <MatchHistoryList
              matches={matchHistory}
              playerProfileId={profile.id}
              limit={5}
            />
          </section>
        </div>
      </div>

    </main>
  );
}
