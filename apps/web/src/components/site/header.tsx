"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/association", label: "L'association" },
  { href: "/#formations", label: "Formations" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/actualites", label: "Actualités" },
  { href: "/adhesion", label: "Devenir membre" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : !href.includes("#") && path.startsWith(href));
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="PRIDe, accueil" className="shrink-0">
          <Image src="/images/logo.png" alt="PRIDe" width={41} height={58} priority className="h-14 w-auto" />
        </Link>
        <nav aria-label="Navigation principale" className="hidden flex-1 gap-6 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn("py-2 text-[15px] font-medium hover:text-brand-600", isActive(l.href) ? "text-brand-600 shadow-[inset_0_-2px_0_var(--color-brand-600)]" : "text-[#2b3832]")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <ButtonLink href="/membre" size="sm" className="ml-auto lg:ml-0">
          Espace membres
        </ButtonLink>
        <details className="relative lg:hidden">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-brand-50" aria-label="Menu">
            <Menu aria-hidden />
          </summary>
          <nav aria-label="Navigation mobile" className="absolute right-0 z-20 mt-2 flex w-60 flex-col rounded-2xl border border-line bg-white p-2 shadow-lg">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn("rounded-xl px-4 py-3 font-medium hover:bg-brand-50", isActive(l.href) && "bg-brand-50 text-brand-800")}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
