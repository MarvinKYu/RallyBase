"use client";

import Link from "next/link";

export default function GlobalError({
  error: _error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-text-1">Something went wrong</h1>
      <p className="text-sm text-text-2">
        An unexpected error occurred. Please try again later.
      </p>
      <Link
        href="/"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
      >
        Go home
      </Link>
    </div>
  );
}
