"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-xl px-3.5 py-2.5 text-left font-medium text-[#2b3832] hover:bg-[#e9eee8]"
      onClick={async () => {
        await authClient.signOut();
        router.push("/connexion");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}
