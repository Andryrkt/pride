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
      {sp.erreur === "compte-inactif" && (
        <p className="rounded-xl bg-flame-50 px-4 py-3 font-semibold text-flame-800">Vous n'êtes plus membre actif de l'association : l'espace membre n'est plus accessible. Pour toute question, contactez l'association.</p>
      )}
      <LoginForm next={sp.suite?.startsWith("/") ? sp.suite : "/membre"} />
    </AuthShell>
  );
}
