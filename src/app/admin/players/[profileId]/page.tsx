import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  isAdminUser,
  getAllRatingCategories,
  getAdminManagedOrgIds,
} from "@/server/services/admin.service";
import { getPlayerProfile } from "@/server/services/player.service";
import { AdminRatingForm } from "@/components/admin/AdminRatingForm";
import { AdminAddRatingForm } from "@/components/admin/AdminAddRatingForm";
import { adminSetRatingAction, adminAddInitialRatingAction } from "@/server/actions/admin.actions";

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
  const [profile, allCategories, managedOrgIds] = await Promise.all([
    getPlayerProfile(profileId),
    getAllRatingCategories(),
    getAdminManagedOrgIds(userId),
  ]);
  if (!profile) notFound();

  const ratedCategoryIds = new Set(profile.playerRatings.map((r) => r.ratingCategoryId));

  const availableCategories = allCategories
    .filter((cat) => !ratedCategoryIds.has(cat.id))
    .filter((cat) => managedOrgIds === null || managedOrgIds.includes(cat.organizationId))
    .map((cat) => ({
      id: cat.id,
      orgId: cat.organization.id,
      orgName: cat.organization.name,
      disciplineName: cat.name,
    }));

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

          <div className="space-y-4">
            {profile.playerRatings.map((rating) => (
              <div key={rating.id} className="rounded-lg border border-border bg-elevated p-4">
                <AdminRatingForm
                  profileId={profile.id}
                  ratingCategoryId={rating.ratingCategoryId}
                  orgName={rating.ratingCategory.organization.name}
                  categoryName={rating.ratingCategory.name}
                  currentRating={rating.rating}
                  gamesPlayed={rating.gamesPlayed}
                  action={adminSetRatingAction.bind(null, profile.id, rating.ratingCategoryId)}
                />
              </div>
            ))}

            <AdminAddRatingForm
              profileId={profile.id}
              availableCategories={availableCategories}
              action={adminAddInitialRatingAction.bind(null, profile.id)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
