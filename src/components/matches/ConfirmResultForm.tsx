"use client";

import { useActionState } from "react";
import { confirmResultAction, type MatchActionState } from "@/server/actions/match.actions";

interface Props {
  matchId: string;
  tournamentId: string;
  eventId: string;
  verificationMethod: "CODE" | "BIRTH_YEAR" | "BOTH";
  isSelfConfirm: boolean;
}

export function ConfirmResultForm({ matchId, tournamentId, eventId, verificationMethod, isSelfConfirm }: Props) {
  const boundAction = confirmResultAction.bind(null, matchId, tournamentId, eventId);
  const [state, dispatch, isPending] = useActionState<MatchActionState, FormData>(
    boundAction,
    null,
  );

  // BOTH + self-confirm: only birth year (submitter can't use the code they generated)
  // BOTH + opponent: both fields shown as alternatives (either is sufficient)
  const showCode = verificationMethod === "CODE" || (verificationMethod === "BOTH" && !isSelfConfirm);
  const showBirthYear = verificationMethod === "BIRTH_YEAR" || verificationMethod === "BOTH";

  return (
    <form action={dispatch} className="space-y-4">
      {state?.error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {showCode && (
        <div className="space-y-1">
          <label htmlFor="confirmationCode" className="block text-sm font-medium text-text-2">
            Confirmation code
          </label>
          <input
            id="confirmationCode"
            name="confirmationCode"
            type="text"
            placeholder="4-digit code from your opponent"
            autoComplete="off"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {state?.fieldErrors?.confirmationCode && (
            <p className="text-sm text-red-400">{state.fieldErrors.confirmationCode[0]}</p>
          )}
        </div>
      )}

      {showBirthYear && (
        <div className="space-y-1">
          <label htmlFor="birthYear" className="block text-sm font-medium text-text-2">
            Opponent&apos;s birth year
          </label>
          <input
            id="birthYear"
            name="birthYear"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="e.g. 1995"
            autoComplete="off"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono text-sm text-text-1 placeholder:text-text-3 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Confirming…" : "Confirm result"}
      </button>
    </form>
  );
}
