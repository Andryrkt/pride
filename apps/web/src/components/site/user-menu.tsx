"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown, CircleUser, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * Menu de l'en-tête (photo ou initiales) : « Mon profil » et « Déconnexion ».
 * S'ouvre au survol (souris) ou au focus (clavier, toucher sur téléphone) ; se ferme en sortant, avec Échap ou au changement de page.
 */
export function UserMenu({ dark, userName, initials, photo }: { dark?: boolean; userName: string; initials: string; photo?: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const close = () => {
    if (root.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  };
  useEffect(close, [path]);
  const item = "flex items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-[#2b3832] hover:bg-brand-50";
  return (
    <div ref={root} className="group relative ml-auto" onKeyDown={(e) => e.key === "Escape" && close()}>
      <button type="button" aria-haspopup="menu" className={cn("flex items-center gap-3 rounded-full py-1 pr-3 pl-1 text-sm font-semibold", dark ? "hover:bg-white/10" : "hover:bg-[#e9eee8]")}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- photo servie par l'API, non optimisable par next/image
          <img src={photo} alt="" className="size-9 rounded-full object-cover object-top" />
        ) : (
          <span className={cn("flex size-9 items-center justify-center rounded-full text-white", dark ? "bg-flame-600" : "bg-brand-600")} aria-hidden>{initials}</span>
        )}
        <span className="hidden sm:inline">{userName}</span>
        <ChevronDown className="size-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
        <span className="sr-only">, menu du compte</span>
      </button>
      {/* pt-2 plutôt que mt-2 : pas d'espace vide entre le nom et le menu, qui se fermerait au passage de la souris */}
      <div role="menu" className="absolute right-0 z-20 hidden w-56 pt-2 group-focus-within:block group-hover:block">
        <div className="flex flex-col rounded-2xl border border-line bg-white p-2 shadow-lg">
          <Link href="/membre/profil" role="menuitem" className={item}>
            <CircleUser className="size-5 shrink-0" aria-hidden />
            Mon profil
          </Link>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={async () => {
              await authClient.signOut();
              router.push("/connexion");
              router.refresh();
            }}
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
