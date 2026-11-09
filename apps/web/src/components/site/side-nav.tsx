"use client";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { MENU_COOKIE, NAV_LABEL } from "./nav-style";

/** Tiroir du menu sur téléphone : ouvert par le bouton ☰ de l'en-tête, affiché par SideNav. */
const Drawer = createContext<{ open: boolean; setOpen: (o: boolean) => void }>({ open: false, setOpen: () => {} });

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Drawer.Provider value={{ open, setOpen }}>{children}</Drawer.Provider>;
}

/** Bouton ☰ de l'en-tête, sur petit écran seulement. */
export function MenuButton({ dark }: { dark?: boolean }) {
  const { open, setOpen } = useContext(Drawer);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-expanded={open}
      aria-controls="menu-lateral"
      className={cn("-ml-2 flex size-11 items-center justify-center rounded-full lg:hidden", dark ? "hover:bg-white/10" : "hover:bg-[#e9eee8]")}
    >
      <Menu aria-hidden />
      <span className="sr-only">Ouvrir le menu</span>
    </button>
  );
}

/**
 * Menu latéral. Grand écran : colonne qu'on peut replier (choix gardé un an dans un cookie).
 * Petit écran : tiroir qui glisse depuis la gauche ; se ferme au choix d'une page, sur le fond sombre, avec Échap ou ✕.
 */
export function SideNav({ initialClosed, children }: { initialClosed: boolean; children: React.ReactNode }) {
  const [closed, setClosed] = useState(initialClosed);
  const { open, setOpen } = useContext(Drawer);
  const path = usePathname();
  useEffect(() => setOpen(false), [path, setOpen]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  function toggle() {
    setClosed(!closed);
    document.cookie = `${MENU_COOKIE}=${closed ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
  }
  const Icon = closed ? PanelLeftOpen : PanelLeftClose;
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <nav
        id="menu-lateral"
        aria-label="Menu"
        data-closed={closed}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className={cn(
          "group flex flex-col gap-1 print:hidden",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:w-72 max-lg:max-w-[85vw] max-lg:overflow-y-auto max-lg:bg-paper max-lg:p-4 max-lg:shadow-xl max-lg:transition-[transform,visibility]",
          open ? "max-lg:translate-x-0" : "max-lg:invisible max-lg:-translate-x-full",
          closed ? "lg:flex-none" : "lg:flex-[1_1_220px] lg:max-w-[250px]",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center gap-3 self-end rounded-xl px-3.5 py-2.5 font-medium text-muted hover:bg-[#e9eee8] lg:hidden"
        >
          <X className="size-5 shrink-0" aria-hidden />
          Fermer
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!closed}
          className="hidden min-h-11 items-center gap-3 self-start rounded-xl px-3.5 py-2.5 font-medium text-muted hover:bg-[#e9eee8] lg:flex"
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className={NAV_LABEL}>{closed ? "Ouvrir le menu" : "Fermer le menu"}</span>
        </button>
        {children}
      </nav>
    </>
  );
}
