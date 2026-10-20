"use client";
import { useActionState } from "react";
import { FormMessage } from "./field";
import { initialFormState, type FormState } from "@/lib/utils";

/** Formulaire relié à une Server Action, avec message de retour. */
export function ActionForm({ action, children, className }: { action: (prev: FormState, data: FormData) => Promise<FormState>; children: React.ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className={className ?? "flex flex-col gap-4"}>
      <FormMessage state={state} />
      {children}
    </form>
  );
}
