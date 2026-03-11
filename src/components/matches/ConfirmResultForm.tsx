"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { confirmResultSchema, type ConfirmResultInput } from "@/lib/schemas/match";
import { confirmResultAction, type MatchActionState } from "@/server/actions/match.actions";

interface Props {
  matchId: string;
  tournamentId: string;
  eventId: string;
}

export function ConfirmResultForm({ matchId, tournamentId, eventId }: Props) {
  const boundAction = confirmResultAction.bind(null, matchId, tournamentId, eventId);
  const [state, dispatch, isPending] = useActionState<MatchActionState, FormData>(
    boundAction,
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfirmResultInput>({
    resolver: zodResolver(confirmResultSchema),
  });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.set("confirmationCode", data.confirmationCode);
    dispatch(fd);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="confirmationCode" className="block text-sm font-medium text-zinc-700">
          Confirmation code
        </label>
        <input
          id="confirmationCode"
          type="text"
          {...register("confirmationCode")}
          placeholder="Enter the code from your opponent"
          autoComplete="off"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {(errors.confirmationCode || state?.fieldErrors?.confirmationCode) && (
          <p className="text-sm text-red-600">
            {errors.confirmationCode?.message ??
              state?.fieldErrors?.confirmationCode?.[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Confirming…" : "Confirm result"}
      </button>
    </form>
  );
}
