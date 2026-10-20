"use client";
import { useState } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/nouveau-mot-de-passe` });
    setSent(true);
  }
  return (
    <AuthShell title="Mot de passe oublié">
      {sent ? (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-brand-800">Si un compte existe pour cette adresse, un e-mail avec un lien vient d'être envoyé.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input label="Votre e-mail" name="email" type="email" required />
          <Button type="submit">Recevoir un lien</Button>
        </form>
      )}
    </AuthShell>
  );
}
