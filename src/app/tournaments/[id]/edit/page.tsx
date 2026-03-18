import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTournamentDetail } from "@/server/services/tournament.service";
import { TournamentForm } from "@/components/tournaments/TournamentForm";
import { updateTournamentAction } from "@/server/actions/tournament.actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTournamentDetail(id);
  return { title: t ? `Edit ${t.name} — RallyBase` : "Tournament not found" };
}

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function toDatetimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default async function EditTournamentPage({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();
  if (tournament.createdByClerkId !== userId) redirect(`/tournaments/${id}`);

  const boundAction = updateTournamentAction.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">{tournament.organization.name}</p>
        <h1 className="text-2xl font-semibold text-text-1">Edit tournament</h1>
      </div>
      <TournamentForm
        action={boundAction}
        defaultValues={{
          name: tournament.name,
          location: tournament.location ?? undefined,
          startDate: toDateInput(tournament.startDate),
          endDate: toDateInput(tournament.endDate),
          startTime: toDatetimeLocal(tournament.startTime),
          withdrawDeadline: toDatetimeLocal(tournament.withdrawDeadline),
        }}
        submitLabel="Save changes"
      />
      <div className="mt-6">
        <Link
          href={`/tournaments/${id}/manage`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to manage
        </Link>
      </div>
    </main>
  );
}
