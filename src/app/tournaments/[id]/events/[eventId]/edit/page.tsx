import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getEventDetail } from "@/server/services/tournament.service";
import { EventForm } from "@/components/tournaments/EventForm";
import { updateEventAction } from "@/server/actions/tournament.actions";
import { DeleteEventButton } from "@/components/tournaments/DeleteEventButton";
import { isAuthorizedAsTD } from "@/server/services/admin.service";

type Props = { params: Promise<{ id: string; eventId: string }> };

export async function generateMetadata({ params }: Props) {
  const { eventId } = await params;
  const e = await getEventDetail(eventId);
  return { title: e ? `Edit ${e.name} — RallyBase` : "Event not found" };
}

function toDatetimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default async function EditEventPage({ params }: Props) {
  const { id, eventId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const event = await getEventDetail(eventId);
  if (!event) notFound();
  if (!(await isAuthorizedAsTD(userId, event.tournament))) redirect(`/tournaments/${id}/events/${eventId}`);

  const boundAction = updateEventAction.bind(null, eventId, id);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 space-y-1">
        <p className="text-sm text-text-3">{event.tournament.name}</p>
        <h1 className="text-2xl font-semibold text-text-1">Edit event</h1>
      </div>
      <EventForm
        action={boundAction}
        defaultValues={{
          name: event.name,
          format: event.format,
          eventFormat: event.eventFormat,
          groupSize: event.groupSize,
          advancersPerGroup: event.advancersPerGroup,
          gamePointTarget: event.gamePointTarget,
          startTime: toDatetimeLocal(event.startTime),
          maxParticipants: event.maxParticipants,
          minRating: event.minRating,
          maxRating: event.maxRating,
          minAge: event.minAge,
          maxAge: event.maxAge,
          allowedGender: event.allowedGender,
          ratingCategoryName: event.ratingCategory.name,
        }}
        submitLabel="Save changes"
      />
      <div className="mt-6 flex items-center justify-between">
        <Link
          href={`/tournaments/${id}/manage`}
          className="text-sm text-text-2 transition-colors hover:text-text-1"
        >
          ← Back to manage
        </Link>
        <DeleteEventButton eventId={eventId} tournamentId={id} />
      </div>
    </main>
  );
}
