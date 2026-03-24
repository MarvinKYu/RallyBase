import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/server/services/admin.service";
import { getPlayerProfile } from "@/server/services/player.service";
import { AdminRatingForm } from "@/components/admin/AdminRatingForm";
import { adminSetRatingAction } from "@/server/actions/admin.actions";

type Props = { params: Promise<{ profileId: string }> };

export async function generateMetadata({ params }: Props) {
  const { profileId } = await params;
  const profile = await getPlayerProfile(profileId);
  return { title: profile ? `${profile.displayName} — RallyBase Admin` : "Player not found" };
}

export default async function AdminPlayerDetailPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) notFound();

  const { profileId } = await params;
  const profile = await getPlayerProfile(profileId);
  if (!profile) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-3">#{profile.playerNumber}</p>
            <h1 className="text-2xl font-semibold text-text-1">{profile.displayName}</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/profile/${profile.id}`}
              className="text-sm text-text-2 hover:text-text-1 transition-colors"
            >
              View profile
            </Link>
            <Link
              href="/admin/players"
              className="text-sm text-text-2 hover:text-text-1 transition-colors"
            >
              ← Players
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-medium text-text-1">Ratings</h2>

          {profile.playerRatings.length === 0 ? (
            <p className="text-sm text-text-3">No ratings on record.</p>
          ) : (
            <div className="space-y-4">
              {profile.playerRatings.map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-elevated p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-text-1">{r.ratingCategory.name}</p>
                    <p className="text-xs text-text-3">{r.ratingCategory.organization.name}</p>
                  </div>
                  <p className="text-2xl font-semibold text-text-1">
                    {Math.round(r.rating)}
                  </p>
                  <p className="text-xs text-text-3">{r.gamesPlayed} games played</p>
                  <AdminRatingForm
                    profileId={profile.id}
                    ratingCategoryId={r.ratingCategoryId}
                    currentRating={r.rating}
                    action={adminSetRatingAction.bind(null, profile.id, r.ratingCategoryId)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
