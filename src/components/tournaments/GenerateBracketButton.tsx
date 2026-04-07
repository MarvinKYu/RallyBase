"use client";

import { track } from "@vercel/analytics/react";
import type { EventFormat } from "@prisma/client";

interface Props {
  action: (formData: FormData) => Promise<void>;
  eventFormat: EventFormat;
  label: string;
}

export function GenerateBracketButton({ action, eventFormat, label }: Props) {
  return (
    <form
      action={action}
      onSubmit={() => track("tournament_start", { event_format: eventFormat })}
    >
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
      >
        {label}
      </button>
    </form>
  );
}
