import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { getMyProfile } from "@/server/services/player.service";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Create a tournament",
    description: "Set up a tournament with one or more events, each tied to a rating category.",
  },
  {
    step: "02",
    title: "Add entrants & seed",
    description: "Search for players, add them as entrants, and assign seed numbers.",
  },
  {
    step: "03",
    title: "Generate the bracket",
    description: "Single-elimination brackets are generated automatically from the seed list.",
  },
  {
    step: "04",
    title: "Submit & confirm scores",
    description:
      "After a match, one player submits the score. The opponent confirms with a code. No referee needed.",
  },
  {
    step: "05",
    title: "Ratings update live",
    description:
      "Elo ratings update the moment a result is confirmed. Track every player's rating history.",
  },
];

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    const profile = await getMyProfile();
    redirect(profile ? `/profile/${profile.id}` : "/onboarding");
  }

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:py-28">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Table tennis · Tournament management
        </p>
        <h1 className="mb-5 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Tournaments & ratings,<br className="hidden sm:block" /> handled.
        </h1>
        <p className="mx-auto mb-10 max-w-md text-base text-zinc-500">
          RallyBase runs your single-elimination brackets and keeps Elo ratings up to date —
          automatically, after every confirmed match result.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <SignUpButton>
            <button className="rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700">
              Get started
            </button>
          </SignUpButton>
          <SignInButton>
            <button className="rounded-md border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
              Sign in
            </button>
          </SignInButton>
        </div>

        {/* Quick browse links — no auth required */}
        <div className="mt-8 flex justify-center gap-6">
          <Link
            href="/tournaments"
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
          >
            Browse tournaments →
          </Link>
          <Link
            href="/players"
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
          >
            Find players →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-100 bg-zinc-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-sm font-semibold uppercase tracking-widest text-zinc-400">
            How it works
          </h2>
          <ol className="space-y-8">
            {WORKFLOW_STEPS.map(({ step, title, description }) => (
              <li key={step} className="flex gap-5">
                <span className="mt-0.5 font-mono text-sm text-zinc-300 select-none shrink-0">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-4 py-6 text-center">
        <p className="text-xs text-zinc-400">
          RallyBase · Built for competitive table tennis clubs and tournaments
        </p>
      </footer>
    </main>
  );
}
