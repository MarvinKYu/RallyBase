import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventManageDetail } from "@/server/services/tournament.service";
import { searchPlayers } from "@/server/services/player.service";
import { EntrantSearchForm } from "@/components/tournaments/EntrantSearchForm";
import { AddEntrantForm } from "@/components/tournaments/AddEntrantForm";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id, eventId } = await params;
  const { userId } = await auth();
  if (!userId) return { title: "Manage Entrants — RallyBase" };
  const event = await getEventManageDetail(eventId, userId);
  return { title: event ? `Entrants — ${event.name} — RallyBase` : "Event not found" };
}

export default async function ManageEntrantsPage({ params, searchParams }: Props) {
  const { id, eventId } = await params;
  const { q = "" } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const event = await getEventManageDetail(eventId, userId);
  if (!event) notFound();

  const enteredIds = event.eventEntries.map((e) => e.playerProfileId);
  const searchResults = q ? await searchPlayers(q) : [];
  const searchPlayers_ = searchResults.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    rating:
      p.playerRatings.find((r) => r.ratingCategoryId === event.ratingCategoryId)?.rating ?? null,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-text-3">
            <Link
              href={`/tournaments/${id}/manage`}
              className="transition-colors hover:text-text-2"
            >
              {event.tournament.name}
            </Link>
            {" · "}
            <Link
              href={`/tournaments/${id}/events/${eventId}/manage`}
              className="transition-colors hover:text-text-2"
            >
              {event.name}
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-text-1">
            Manage Entrants
          </h1>
        </div>

        {/* Current entrants */}
        <section>
          <h2 className="mb-4 text-lg font-medium text-text-1">
            Entrants ({event.eventEntries.length}
            {event.maxParticipants ? `/${event.maxParticipants}` : ""})
          </h2>
          {event.eventEntries.length === 0 ? (
            <p className="text-sm text-text-2">No entrants yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border">
              {event.eventEntries.map((entry) => {
                const rating = entry.playerProfile.playerRatings.find(
                  (r) => r.ratingCategoryId === event.ratingCategoryId,
                );
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3 last:border-b-0"
                  >
                    <Link
                      href={`/profile/${entry.playerProfileId}`}
                      className="text-sm font-medium text-text-1 transition-colors hover:underline"
                    >
                      {entry.playerProfile.displayName}
                    </Link>
                    <span className="text-sm text-text-2">
                      {rating ? Math.round(rating.rating) : "Unrated"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Add entrant */}
        <section>
          <h2 className="mb-4 text-lg font-medium text-text-1">Add entrant</h2>
          <div className="space-y-4">
            <Suspense>
              <EntrantSearchForm />
            </Suspense>

            {q && searchResults.length === 0 && (
              <p className="text-sm text-text-2">
                No players found for &ldquo;{q}&rdquo;.
              </p>
            )}

            <AddEntrantForm
              eventId={eventId}
              tournamentId={id}
              players={searchPlayers_}
              enteredIds={enteredIds}
            />
          </div>
        </section>

        <Link
          href={`/tournaments/${id}/events/${eventId}/manage`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to manage event
        </Link>
      </div>
    </main>
  );
}
