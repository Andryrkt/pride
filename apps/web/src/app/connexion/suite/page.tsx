import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";

/** Après la connexion : le comptable (qui n'est pas dirigeant) arrive sur son espace Finances, les autres sur leur espace membre. */
export default async function AfterLogin() {
  const v = await getViewer();
  if (!v) redirect("/connexion");
  redirect(v.isComptable && !v.isDirigeant ? "/finances" : "/membre");
}
