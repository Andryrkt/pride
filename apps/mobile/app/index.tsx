import { Redirect } from "expo-router";
import { Loading } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function Index() {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <Loading />;
  return <Redirect href={data ? "/accueil" : "/connexion"} />;
}
