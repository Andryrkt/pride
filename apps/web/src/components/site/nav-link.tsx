"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, label, badge }: { href: string; label: string; badge?: number }) {
  const path = usePathname();
  const root = href === "/membre" || href === "/dirigeants";
  const active = root ? path === href : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-11 items-center justify-between rounded-xl px-3.5 py-2.5 font-medium", active ? "bg-brand-600 text-white" : "text-[#2b3832] hover:bg-[#e9eee8]")}
    >
      {label}
      {!!badge && <span className={cn("min-w-6 rounded-full px-1.5 text-center text-xs font-bold", active ? "bg-white text-flame-800" : "bg-flame-600 text-white")}>{badge}</span>}
    </Link>
  );
}
