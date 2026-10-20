"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const control = "w-full min-h-12 rounded-xl border-[1.5px] border-[#c3ccc5] bg-white px-3.5 text-[15px] text-ink placeholder:text-[#6b776f] focus:border-brand-600 focus:outline-none";

/** `id` : à préciser quand plusieurs champs de la page portent le même `name`. */
type FieldProps = { label: string; name: string; id?: string; error?: string; required?: boolean; hint?: string; className?: string };

function Wrap({ label, name, id = name, error, required, hint, className, children }: FieldProps & { children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-[#2b3832]">
        {label}
        {required && <span className="text-flame-600" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-[13.5px] font-semibold text-flame-800">
          {error}
        </p>
      )}
    </div>
  );
}

/** L'erreur disparaît dès que la personne corrige le champ. */
function useLiveError(error?: string) {
  const [edited, setEdited] = useState<string | undefined>(undefined);
  const shown = error && edited !== error ? error : undefined;
  return [shown, () => setEdited(error)] as const;
}

export function Input({ label, id, error, required, hint, className, onChange, ...props }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, clear] = useLiveError(error);
  return (
    <Wrap label={label} name={props.name} id={id ?? props.name} error={shown} required={required} hint={hint} className={className}>
      <input id={id ?? props.name} required={required} aria-invalid={!!shown} aria-describedby={shown ? `${id ?? props.name}-error` : undefined} className={cn(control, shown && "border-flame-600")} onChange={(e) => { clear(); onChange?.(e); }} {...props} />
    </Wrap>
  );
}

export function Textarea({ label, id, error, required, hint, className, onChange, ...props }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [shown, clear] = useLiveError(error);
  return (
    <Wrap label={label} name={props.name} id={id ?? props.name} error={shown} required={required} hint={hint} className={className}>
      <textarea id={id ?? props.name} required={required} aria-invalid={!!shown} className={cn(control, "min-h-32 py-3", shown && "border-flame-600")} onChange={(e) => { clear(); onChange?.(e); }} {...props} />
    </Wrap>
  );
}

export function Select({ label, id, error, required, hint, className, children, onChange, ...props }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [shown, clear] = useLiveError(error);
  return (
    <Wrap label={label} name={props.name} id={id ?? props.name} error={shown} required={required} hint={hint} className={className}>
      <select id={id ?? props.name} required={required} aria-invalid={!!shown} className={cn(control, shown && "border-flame-600")} onChange={(e) => { clear(); onChange?.(e); }} {...props}>
        {children}
      </select>
    </Wrap>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <p role="status" className={cn("rounded-xl px-4 py-3 font-semibold", state.ok ? "bg-brand-50 text-brand-800" : "bg-flame-50 text-flame-800")}>
      {state.message}
    </p>
  );
}

export function RequiredLegend() {
  return (
    <p className="text-[13.5px] text-muted">
      <span className="text-flame-600">*</span> champ obligatoire
    </p>
  );
}
