import Image from "next/image";
import Link from "next/link";
import { CircleHelp, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink } from "./nav-link";
import { cookies } from "next/headers";
import { MENU_COOKIE, NAV_ITEM, NAV_LABEL } from "./nav-style";
import { SideNav } from "./side-nav";
import { SignOutButton } from "./sign-out-button";

/** `also` : autres adresses où l'entrée reste en surbrillance (ex. les onglets de « Apprendre »). */
export type NavItem = { href: string; label: string; badge?: number; also?: string[] };

export async function AppShell({ space, dark, nav, userName, initials, photo, extra, children }: { space: string; dark?: boolean; nav: NavItem[]; userName: string; initials: string; photo?: string | null; extra?: NavItem[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper print:bg-white">
      <header className={cn("flex flex-wrap items-center gap-4 px-6 py-3 print:hidden", dark ? "bg-brand-900 text-white" : "border-b border-line bg-white")}>
        <Link href="/" aria-label="PRIDe, site public">
          <Image src={dark ? "/images/logo-blanc.png" : "/images/logo.png"} alt="PRIDe" width={32} height={46} className="h-11 w-auto" />
        </Link>
        <span className={cn("rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider", dark ? "bg-[#9fd8b8] text-brand-900" : "bg-brand-50 text-brand-800")}>{space}</span>
        <Link href="/membre/profil" title="Mon profil" className={cn("ml-auto flex items-center gap-3 rounded-full py-1 pr-3 pl-1 text-sm font-semibold", dark ? "hover:bg-white/10" : "hover:bg-[#e9eee8]")}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- photo servie par l'API, non optimisable par next/image
            <img src={photo} alt="" className="size-9 rounded-full object-cover object-top" />
          ) : (
            <span className={cn("flex size-9 items-center justify-center rounded-full text-white", dark ? "bg-flame-600" : "bg-brand-600")} aria-hidden>{initials}</span>
          )}
          <span className="hidden sm:inline">{userName}</span>
          <span className="sr-only">, ouvrir mon profil</span>
        </Link>
      </header>
      <div className="mx-auto flex max-w-[1320px] flex-wrap gap-7 px-4 py-7 sm:px-6 print:block print:p-0">
        <SideNav initialClosed={(await cookies()).get(MENU_COOKIE)?.value === "1"}>
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
          <hr className={cn("my-2 border-line", NAV_ITEM)} />
          {extra?.map((n) => <NavLink key={n.href} {...n} />)}
          <Link href="/aide" className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-[#2b3832] hover:bg-[#e9eee8]", NAV_ITEM)}><CircleHelp className="size-5 shrink-0" aria-hidden /><span className={NAV_LABEL}>Aide</span></Link>
          <Link href="/" className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-[#2b3832] hover:bg-[#e9eee8]", NAV_ITEM)}><House className="size-5 shrink-0" aria-hidden /><span className={NAV_LABEL}>Retour au site</span></Link>
          <SignOutButton />
        </SideNav>
        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">{children}</main>
      </div>
    </div>
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
