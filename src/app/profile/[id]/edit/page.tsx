import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getPlayerProfile } from "@/server/services/player.service";
import { ProfileEditForm } from "@/components/players/ProfileEditForm";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Profile — RallyBase" };

export default async function ProfileEditPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await getPlayerProfile(id);
  if (!profile) notFound();

  if (profile.user.clerkId !== userId) redirect(`/profile/${id}`);

  const birthDateValue = profile.birthDate
    ? profile.birthDate.toISOString().slice(0, 10)
    : "";

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">
          <Link href={`/profile/${id}`} className="hover:text-text-2">
            {profile.displayName}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold text-text-1">Edit profile</h1>
      </div>

      <ProfileEditForm
        profileId={id}
        defaultValues={{
          displayName: profile.displayName,
          bio: profile.bio ?? "",
          gender: profile.gender ?? "",
          birthDate: birthDateValue,
        }}
      />

      <div className="mt-6">
        <Link
          href={`/profile/${id}`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Cancel
        </Link>
      </div>
    </main>
  );
}
