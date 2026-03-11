import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { getMyProfile } from "@/server/services/player.service";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    const profile = await getMyProfile();
    redirect(profile ? `/profile/${profile.id}` : "/onboarding");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="mb-4 text-4xl font-semibold tracking-tight text-zinc-900">
        RallyBase
      </h1>
      <p className="mb-10 text-lg text-zinc-500">
        Table tennis tournament management and rating tracking.
      </p>
      <div className="flex justify-center gap-4">
        <SignInButton>
          <button className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="rounded-md border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
            Sign up
          </button>
        </SignUpButton>
      </div>
    </main>
  );
}
