import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlayerProfile } from "@/server/services/player.service";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return { title: profile ? `${profile.displayName} — RallyBase` : "Player not found" };
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  if (!profile) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">
            {profile.displayName}
          </h1>
          {profile.bio && (
            <p className="mt-2 text-zinc-600">{profile.bio}</p>
          )}
        </div>

        {/* Ratings */}
        <section>
          <h2 className="mb-4 text-lg font-medium text-zinc-900">Ratings</h2>
          {profile.playerRatings.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No ratings yet. Enter a tournament to get started.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              {profile.playerRatings.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {pr.ratingCategory.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {pr.ratingCategory.organization.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-zinc-900">
                      {Math.round(pr.rating)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {pr.gamesPlayed} game{pr.gamesPlayed !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Link
          href="/players"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Back to player search
        </Link>
      </div>
    </main>
  );
}
