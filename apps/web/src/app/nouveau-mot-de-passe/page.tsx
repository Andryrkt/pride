"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p1 = String(f.get("password"));
    if (p1 !== String(f.get("confirm"))) return setError("Les deux mots de passe ne sont pas identiques.");
    if (p1.length < 10) return setError("10 caractères minimum.");
    const { error } = await authClient.resetPassword({ newPassword: p1, token: token ?? "" });
    if (error) return setError("Ce lien n'est plus valable. Demandez-en un nouveau.");
    setDone(true);
  }
  if (!token) return <p className="text-flame-800">Lien invalide.</p>;
  if (done)
    return (
      <p className="rounded-xl bg-brand-50 px-4 py-3 text-brand-800">
        Mot de passe enregistré. <Link href="/connexion" className="font-semibold underline">Se connecter</Link>
      </p>
    );
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-xl bg-flame-50 px-4 py-3 font-semibold text-flame-800">{error}</p>}
      <Input label="Nouveau mot de passe" name="password" type="password" required minLength={10} hint="10 caractères minimum" autoComplete="new-password" />
      <Input label="Confirmer" name="confirm" type="password" required autoComplete="new-password" />
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choisir mon mot de passe">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
