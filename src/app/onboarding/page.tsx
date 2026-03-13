import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/server/services/player.service";
import { ProfileForm } from "@/components/onboarding/ProfileForm";

export const metadata = { title: "Create Your Profile — RallyBase" };

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const profile = await getMyProfile();
  if (profile) redirect(`/profile/${profile.id}`);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold text-text-1">
          Create your player profile
        </h1>
        <p className="text-sm text-text-2">
          Set up your profile to start tracking ratings and entering
          tournaments.
        </p>
      </div>
      <ProfileForm />
    </main>
  );
}
