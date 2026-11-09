"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown, CircleUser, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** Menu de l'en-tête (photo ou initiales) : « Mon profil » et « Déconnexion ». Se ferme comme le menu mobile du site. */
export function UserMenu({ dark, userName, initials, photo }: { dark?: boolean; userName: string; initials: string; photo?: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    menu.current?.removeAttribute("open");
  }, [path]);
  useEffect(() => {
    const close = (e: Event) => {
      const d = menu.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const item = "flex items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-[#2b3832] hover:bg-brand-50";
  return (
    <details ref={menu} className="relative ml-auto">
      <summary className={cn("flex cursor-pointer list-none items-center gap-3 rounded-full py-1 pr-3 pl-1 text-sm font-semibold", dark ? "hover:bg-white/10" : "hover:bg-[#e9eee8]")}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- photo servie par l'API, non optimisable par next/image
          <img src={photo} alt="" className="size-9 rounded-full object-cover object-top" />
        ) : (
          <span className={cn("flex size-9 items-center justify-center rounded-full text-white", dark ? "bg-flame-600" : "bg-brand-600")} aria-hidden>{initials}</span>
        )}
        <span className="hidden sm:inline">{userName}</span>
        <ChevronDown className="size-4" aria-hidden />
        <span className="sr-only">, menu du compte</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 flex w-56 flex-col rounded-2xl border border-line bg-white p-2 shadow-lg">
        <Link href="/membre/profil" className={item}>
          <CircleUser className="size-5 shrink-0" aria-hidden />
          Mon profil
        </Link>
        <button
          type="button"
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
    </details>
  );
}
