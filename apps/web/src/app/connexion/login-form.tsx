"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({ email: String(f.get("email")), password: String(f.get("password")), rememberMe: f.get("remember") === "on" });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Trop de tentatives. Réessayez dans quelques minutes." : "E-mail ou mot de passe incorrect.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-xl bg-flame-50 px-4 py-3 font-semibold text-flame-800">{error}</p>}
      <Input label="E-mail" name="email" type="email" required autoComplete="email" />
      <Input label="Mot de passe" name="password" type="password" required autoComplete="current-password" />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="remember" defaultChecked className="size-4" /> Rester connecté</label>
        <Link href="/mot-de-passe-oublie" className="font-semibold text-brand-600">Mot de passe oublié ?</Link>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</Button>
      <p className="text-sm text-muted">Pas encore membre ? <Link href="/adhesion" className="font-semibold text-brand-600">Déposer une candidature</Link></p>
    </form>
  );
}
