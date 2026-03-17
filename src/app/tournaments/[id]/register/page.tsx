import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentDetail, getRegisteredEventIds, checkEligibility } from "@/server/services/tournament.service";
import { getMyProfile } from "@/server/services/player.service";
import { findPlayerRatingByCategory } from "@/server/repositories/rating.repository";
import { RegisterForm } from "@/components/tournaments/RegisterForm";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTournamentDetail(id);
  return { title: t ? `Register — ${t.name} — RallyBase` : "Tournament not found" };
}

export default async function RegisterPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getMyProfile();
  if (!profile) redirect(`/tournaments/${id}`);

  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  const eventIds = tournament.events.map((e) => e.id);
  const registeredIds = new Set(
    eventIds.length > 0 ? await getRegisteredEventIds(profile.id, eventIds) : [],
  );

  const eventRows = await Promise.all(
    tournament.events.map(async (event) => {
      const playerRating = await findPlayerRatingByCategory(profile.id, event.ratingCategoryId);
      const entrantCount = event._count.eventEntries;
      const eligibilityEvent = { ...event, tournament: { startDate: tournament.startDate } };
      const eligibility = checkEligibility(profile, playerRating, eligibilityEvent, entrantCount);
      return {
        id: event.id,
        name: event.name,
        startTime: (event as { startTime?: Date | null }).startTime ?? null,
        status: event.status,
        alreadyRegistered: registeredIds.has(event.id),
        eligibility,
      };
    }),
  );

  // Fallback: tournament start time displayed as-is; event fallback = tournament.startTime + 1h (display only)
  const tournamentStartTime = (tournament as { startTime?: Date | null }).startTime ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <RegisterForm
          tournamentId={id}
          tournamentName={tournament.name}
          tournamentStartTime={tournamentStartTime}
          events={eventRows}
        />
        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to tournament
        </Link>
      </div>
    </main>
  );
}
