import Image from "next/image";
import Link from "next/link";
import { CircleHelp, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink } from "./nav-link";
import { cookies } from "next/headers";
import { MENU_COOKIE, NAV_LABEL } from "./nav-style";
import { MenuButton, MenuProvider, SideNav } from "./side-nav";
import { UserMenu } from "./user-menu";

/** `also` : autres adresses où l'entrée reste en surbrillance (ex. les onglets de « Apprendre »). */
export type NavItem = { href: string; label: string; badge?: number; also?: string[] };

export async function AppShell({ space, dark, nav, userName, initials, photo, extra, children }: { space: string; dark?: boolean; nav: NavItem[]; userName: string; initials: string; photo?: string | null; extra?: NavItem[]; children: React.ReactNode }) {
  return (
    <MenuProvider>
    <div className="min-h-screen bg-paper print:bg-white">
      <header className={cn("flex flex-wrap items-center gap-4 px-6 py-3 print:hidden", dark ? "bg-brand-900 text-white" : "border-b border-line bg-white")}>
        <MenuButton dark={dark} />
        <Link href="/" aria-label="PRIDe, site public">
          <Image src={dark ? "/images/logo-blanc.png" : "/images/logo.png"} alt="PRIDe" width={32} height={46} className="h-11 w-auto" />
        </Link>
        <span className={cn("rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider", dark ? "bg-[#9fd8b8] text-brand-900" : "bg-brand-50 text-brand-800")}>{space}</span>
        <UserMenu dark={dark} userName={userName} initials={initials} photo={photo} />
      </header>
      <div className="mx-auto flex max-w-[1320px] flex-wrap gap-7 px-4 py-7 sm:px-6 print:block print:p-0">
        <SideNav initialClosed={(await cookies()).get(MENU_COOKIE)?.value === "1"}>
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
          <hr className="my-2 border-line" />
          {extra?.map((n) => <NavLink key={n.href} {...n} />)}
          <Link href="/aide" className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-[#2b3832] hover:bg-[#e9eee8]")}><CircleHelp className="size-5 shrink-0" aria-hidden /><span className={NAV_LABEL}>Aide</span></Link>
          <Link href="/" className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-[#2b3832] hover:bg-[#e9eee8]")}><House className="size-5 shrink-0" aria-hidden /><span className={NAV_LABEL}>Retour au site</span></Link>
        </SideNav>
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">{children}</main>
      </div>
    </div>
    </MenuProvider>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
