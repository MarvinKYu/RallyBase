import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentDetail, getRatingCategoriesForOrg } from "@/server/services/tournament.service";
import { EventForm } from "@/components/tournaments/EventForm";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "New Event — RallyBase" };

export default async function NewEventPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  const isTournamentCreator = tournament.createdByClerkId === userId;
  if (!isTournamentCreator) redirect(`/tournaments/${id}`);

  const ratingCategories = await getRatingCategoriesForOrg(tournament.organizationId);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">{tournament.name}</p>
        <h1 className="text-2xl font-semibold text-text-1">Create event</h1>
        <p className="text-sm text-text-2">Add an event to this tournament.</p>
      </div>
      <EventForm
        tournamentId={id}
        ratingCategories={ratingCategories}
        isTournamentCreator={isTournamentCreator}
      />
      <div className="mt-6">
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
