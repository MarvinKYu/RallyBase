import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMyTournaments } from "@/server/services/tournament.service";
import TDTournamentGroup from "@/components/tournaments/TDTournamentGroup";

export const metadata = { title: "Tournament Directors — RallyBase" };

const GROUPS = [
  { status: "DRAFT", label: "Drafts", href: "/tournament-directors/drafts" },
  { status: "PUBLISHED", label: "Published", href: "/tournament-directors/published" },
  { status: "IN_PROGRESS", label: "In Progress", href: "/tournament-directors/in-progress" },
  { status: "COMPLETED", label: "Completed", href: "/tournament-directors/completed" },
] as const;

export default async function TournamentDirectorsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournaments = await getMyTournaments(userId);

  const isEmpty = tournaments.length === 0;

  const byStatus = Object.fromEntries(
    GROUPS.map(({ status }) => [
      status,
      tournaments.filter((t) => t.status === status),
    ]),
  ) as Record<string, typeof tournaments>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">Tournament Directors</h1>
          <p className="mt-1 text-sm text-text-2">Manage your tournaments.</p>
        </div>
        <Link
          href="/tournaments/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
        >
          New tournament
        </Link>
      </div>

      {isEmpty ? (
        /* Empty state */
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface px-8 py-12 text-center">
          <h2 className="text-lg font-semibold text-text-1">Create your first tournament</h2>
          <p className="mt-2 text-sm text-text-2">
            Run your own table tennis events on RallyBase. Here&apos;s how to get started:
          </p>
          <ol className="mt-6 space-y-3 text-left text-sm text-text-2">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">1</span>
              <span><strong className="text-text-1">Create a tournament</strong> — set the name, organization, dates, and location.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">2</span>
              <span><strong className="text-text-1">Add events</strong> — configure format (SE or RR), rating category, and eligibility rules.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">3</span>
              <span><strong className="text-text-1">Publish</strong> — opens registration so players can sign up for events.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">4</span>
              <span><strong className="text-text-1">Start the tournament</strong> — brackets and schedules are generated automatically.</span>
            </li>
          </ol>
          <Link
            href="/tournaments/new"
            className="mt-8 inline-flex rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
          >
            Create your first tournament
          </Link>
        </div>
      ) : (
        <>
          {/* 4-column tournament status grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {GROUPS.map(({ status, label, href }) => (
              <TDTournamentGroup
                key={status}
                label={label}
                tournaments={byStatus[status]}
                viewAllHref={href}
              />
            ))}
          </div>

          {/* Templates placeholder */}
          <section className="mt-12">
            <div className="rounded-xl border border-border bg-surface px-6 py-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-text-1">Templates</h2>
                  <p className="mt-1 text-sm text-text-2">
                    Save tournament configurations as reusable templates — coming in v1.1.0.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-text-3">
                  Coming soon
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
