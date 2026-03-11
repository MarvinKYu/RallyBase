import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail } from "@/server/services/tournament.service";
import { searchPlayers } from "@/server/services/player.service";
import { addEntrantAction } from "@/server/actions/tournament.actions";
import { EntrantSearchForm } from "@/components/tournaments/EntrantSearchForm";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  return { title: event ? `${event.name} — RallyBase` : "Event not found" };
}

const formatLabel: Record<string, string> = {
  BEST_OF_3: "Best of 3",
  BEST_OF_5: "Best of 5",
  BEST_OF_7: "Best of 7",
};

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { id, eventId } = await params;
  const { q = "" } = await searchParams;
  const { userId } = await auth();

  const event = await getEventDetail(eventId);
  if (!event) notFound();

  const enteredIds = new Set(event.eventEntries.map((e) => e.playerProfileId));
  const searchResults = q ? await searchPlayers(q) : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-zinc-400">
            <Link href={`/tournaments/${id}`} className="transition-colors hover:text-zinc-700">
              {event.tournament.name}
            </Link>
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">{event.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {event.ratingCategory.name} ·{" "}
            {formatLabel[event.format] ?? event.format} · First to {event.gamePointTarget}
          </p>
        </div>

        {/* Entrants */}
        <section>
          <h2 className="mb-4 text-lg font-medium text-zinc-900">
            Entrants ({event.eventEntries.length})
          </h2>
          {event.eventEntries.length === 0 ? (
            <p className="text-sm text-zinc-500">No entrants yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-zinc-200">
              {event.eventEntries.map((entry) => {
                const rating = entry.playerProfile.playerRatings.find(
                  (r) => r.ratingCategoryId === event.ratingCategoryId,
                );
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 last:border-b-0"
                  >
                    <Link
                      href={`/profile/${entry.playerProfileId}`}
                      className="text-sm font-medium text-zinc-900 transition-colors hover:underline"
                    >
                      {entry.playerProfile.displayName}
                    </Link>
                    <span className="text-sm text-zinc-500">
                      {rating ? Math.round(rating.rating) : "Unrated"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Add entrant — signed-in users only */}
        {userId && (
          <section>
            <h2 className="mb-4 text-lg font-medium text-zinc-900">Add entrant</h2>
            <div className="space-y-4">
              <Suspense>
                <EntrantSearchForm />
              </Suspense>

              {q && searchResults.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No players found for &ldquo;{q}&rdquo;.
                </p>
              )}

              {searchResults.length > 0 && (
                <ul className="overflow-hidden rounded-lg border border-zinc-200">
                  {searchResults.map((player) => {
                    const alreadyIn = enteredIds.has(player.id);
                    return (
                      <li
                        key={player.id}
                        className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 last:border-b-0"
                      >
                        <span className="text-sm text-zinc-900">{player.displayName}</span>
                        {alreadyIn ? (
                          <span className="text-xs text-zinc-400">Already entered</span>
                        ) : (
                          <form action={addEntrantAction.bind(null, eventId, id)}>
                            <input type="hidden" name="playerProfileId" value={player.id} />
                            <button
                              type="submit"
                              className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
                            >
                              Add
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}

        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back to tournament
        </Link>
      </div>
    </main>
  );
}
