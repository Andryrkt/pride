import { AuthShell } from "@/components/site/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string; suite?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Se connecter">
      {sp.erreur === "compte-sans-fiche" && (
        <p className="rounded-xl bg-flame-50 px-4 py-3 font-semibold text-flame-800">Ce compte n'est relié à aucune fiche de membre. Contactez le Secrétariat général.</p>
      )}
      <LoginForm next={sp.suite?.startsWith("/") ? sp.suite : "/membre"} />
    </AuthShell>
  );
}
