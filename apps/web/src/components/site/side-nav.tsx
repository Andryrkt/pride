"use client";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

import { MENU_COOKIE, NAV_LABEL } from "./nav-style";

/** Menu latéral qu'on peut ouvrir ou fermer ; le choix est gardé un an dans un cookie. */
export function SideNav({ initialClosed, children }: { initialClosed: boolean; children: React.ReactNode }) {
  const [closed, setClosed] = useState(initialClosed);
  function toggle() {
    setClosed(!closed);
    document.cookie = `${MENU_COOKIE}=${closed ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
  }
  const Icon = closed ? PanelLeftOpen : PanelLeftClose;
  return (
    <nav
      aria-label="Menu"
      data-closed={closed}
      className={cn("group flex flex-col gap-1 print:hidden", closed ? "flex-[1_1_100%] lg:flex-none" : "flex-[1_1_220px] lg:max-w-[250px]")}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!closed}
        className="flex min-h-11 items-center gap-3 self-start rounded-xl px-3.5 py-2.5 font-medium text-muted hover:bg-[#e9eee8]"
      >
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className={NAV_LABEL}>{closed ? "Ouvrir le menu" : "Fermer le menu"}</span>
      </button>
      {children}
    </nav>
  );
}
