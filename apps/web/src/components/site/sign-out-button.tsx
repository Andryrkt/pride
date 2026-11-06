"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEM, NAV_LABEL } from "./nav-style";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left font-medium text-[#2b3832] hover:bg-[#e9eee8] ${NAV_ITEM}`}
      onClick={async () => {
        await authClient.signOut();
        router.push("/connexion");
        router.refresh();
      }}
    >
      <LogOut className="size-5 shrink-0" aria-hidden />
      <span className={NAV_LABEL}>Déconnexion</span>
    </button>
  );
}
