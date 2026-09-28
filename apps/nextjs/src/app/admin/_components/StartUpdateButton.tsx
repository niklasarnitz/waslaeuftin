"use client";

import { useActionState } from "react";

import type { StartUpdateState } from "@waslaeuftin/app/admin/actions";
import { startUpdateAction } from "@waslaeuftin/app/admin/actions";
import { Button } from "@waslaeuftin/components/ui/button";

export const StartUpdateButton = ({
  provider,
  label,
  disabled,
}: {
  provider?: string;
  label: string;
  disabled: boolean;
}) => {
  const [state, formAction, pending] = useActionState<
    StartUpdateState,
    FormData
  >(startUpdateAction, null);

  return (
    <form action={formAction} className="flex items-center gap-2">
      {provider ? (
        <input type="hidden" name="provider" value={provider} />
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant={provider ? "outline" : "default"}
        disabled={disabled || pending}
      >
        {pending ? "Starting…" : label}
      </Button>
      {state && !state.ok ? (
        <span className="text-xs text-red-600 dark:text-red-400">
          {state.message}
        </span>
      ) : null}
    </form>
  );
};
