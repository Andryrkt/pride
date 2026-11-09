"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote, BookOpen, BookUser, Briefcase, CircleUser, Clock, FileCheck, FileText, GraduationCap, HandHeart, Landmark,
  LayoutDashboard, Library, Lightbulb, type LucideIcon, Megaphone, MessagesSquare, Newspaper, PiggyBank, SearchCheck, Smartphone,
  Target, UserCheck, Users, Vote, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LABEL } from "./nav-style";

/** Icône de chaque entrée du menu, par adresse (une adresse sans icône s'affiche sans). */
const ICONS: Record<string, LucideIcon> = {
  "/membre": CircleUser,
  "/membre/actualites": Newspaper,
  "/membre/cotisations": Wallet,
  "/membre/formations": GraduationCap,
  "/membre/competences": Users,
  "/membre/discipline": Target,
  "/membre/ag": Vote,
  "/membre/budget": PiggyBank,
  "/membre/messages": MessagesSquare,
  "/membre/profil": CircleUser,
  "/dirigeants": Briefcase,
  "/dirigeants/adhesions": UserCheck,
  "/dirigeants/membres": BookUser,
  "/dirigeants/commissions": Users,
  "/dirigeants/solidarite": HandHeart,
  "/dirigeants/offres": Megaphone,
  "/dirigeants/propositions": Lightbulb,
  "/dirigeants/actualites": Newspaper,
  "/dirigeants/ag": Vote,
  "/dirigeants/documents": FileText,
  "/dirigeants/messages": MessagesSquare,
  "/finances": Landmark,
  "/finances/verifier": SearchCheck,
  "/finances/depenses": FileCheck,
  "/finances/encaisser": Banknote,
  "/finances/paiements": Clock,
  "/finances/journal": BookOpen,
  "/finances/livre": Library,
  "/finances/budget": PiggyBank,
  "/finances/numeros": Smartphone,
};

export function NavLink({ href, label, badge, also }: { href: string; label: string; badge?: number; also?: string[] }) {
  const path = usePathname();
  const root = href === "/membre" || href === "/dirigeants" || href === "/finances";
  const active = root ? path === href : [href, ...(also ?? [])].some((h) => path.startsWith(h));
  const Icon = label === "Tableau de bord" ? LayoutDashboard : ICONS[href];
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium", active ? "bg-brand-600 text-white" : "text-[#2b3832] hover:bg-[#e9eee8]")}
    >
      {Icon && <Icon className="size-5 shrink-0" aria-hidden />}
      <span className={NAV_LABEL}>{label}</span>
      {!!badge && <span className={cn("min-w-6 rounded-full px-1.5 text-center text-xs font-bold", active ? "bg-white text-flame-800" : "bg-flame-600 text-white")}>{badge}</span>}
    </Link>
  );
}
