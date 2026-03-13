import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrganizations } from "@/server/services/tournament.service";
import { TournamentForm } from "@/components/tournaments/TournamentForm";

export const metadata = { title: "New Tournament — RallyBase" };

export default async function NewTournamentPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const organizations = await getOrganizations();

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold text-text-1">Create tournament</h1>
        <p className="text-sm text-text-2">Set up a new tournament for your organization.</p>
      </div>
      <TournamentForm organizations={organizations} />
      <div className="mt-6">
        <Link
          href="/tournaments"
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to tournaments
        </Link>
      </div>
    </main>
  );
}
