import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, db, eq, gte, isNull, lte, or, schema } from "@pride/db";
import { BUREAU_ROLES, CA_ROLES, DIRIGEANT_ROLES, type MandateRole } from "@pride/shared";
import { auth } from "./auth";

export type Viewer = Awaited<ReturnType<typeof loadViewer>>;

async function loadViewer(reqHeaders: Headers) {
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return null;
  const member = await db.query.members.findFirst({ where: eq(schema.members.userId, session.user.id) });
  const today = new Date();
  const mandates = member
    ? await db.query.mandates.findMany({
        where: and(eq(schema.mandates.memberId, member.id), or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, today))),
      })
    : [];
  const roles = mandates.map((m) => m.role as MandateRole);
  // Poste de Trésorier vacant : le Coordonnateur le remplace, jusqu'à ce qu'un Trésorier soit en fonction.
  const actingTreasurer =
    roles.includes("COORDONNATEUR") &&
    !(await db.query.mandates.findFirst({ where: and(eq(schema.mandates.role, "TRESORIER"), lte(schema.mandates.startsAt, today), or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, today))) }));
  if (actingTreasurer) roles.push("TRESORIER");
  return {
    user: session.user,
    member,
    roles,
    actingTreasurer,
    isDirigeant: roles.some((r) => DIRIGEANT_ROLES.includes(r)),
    isCA: roles.some((r) => CA_ROLES.includes(r)),
    isBureau: roles.some((r) => BUREAU_ROLES.includes(r)),
    isAdmin: roles.includes("ADMIN_TECHNIQUE"),
    isComptable: roles.includes("COMPTABLE"),
    /** Commissions dont le membre est responsable (il en prépare les lignes du budget). */
    commissionIds: mandates.flatMap((m) => (m.role === "RESPONSABLE_COMMISSION" && m.commissionId ? [m.commissionId] : [])),
  };
}

/** Utilisateur connecté (ou null), mis en cache pour la requête. */
export const getViewer = cache(async () => loadViewer(await headers()));

/** Pour l'API mobile : lit la session depuis les en-têtes de la requête. */
export const getViewerFromRequest = (req: Request) => loadViewer(req.headers);

export async function requireMember() {
  const v = await getViewer();
  if (!v) redirect("/connexion");
  if (!v.member) redirect("/connexion?erreur=compte-sans-fiche");
  // Démission, exclusion ou décès : l'espace membre est fermé.
  if (v.member.status !== "ACTIF") redirect("/connexion?erreur=compte-inactif");
  return v as typeof v & { member: NonNullable<typeof v.member> };
}

export async function requireDirigeant() {
  const v = await requireMember();
  if (!v.isDirigeant) redirect("/membre");
  return v;
}

/** Décisions sur les adhésions : membres du CA, Secrétaire générale, administrateur. */
export function canDecideApplications(v: NonNullable<Viewer>) {
  return v.isCA || v.isAdmin || v.roles.includes("SECRETAIRE_GENERALE");
}

/** Désignation des responsables et composition des commissions : CA, Coordonnateur, administrateur. */
export function canManageCommissions(v: NonNullable<Viewer>) {
  return v.isCA || v.isAdmin || v.roles.includes("COORDONNATEUR");
}

/** Préparation, convocation, tenue de l'AG et procès-verbal : CA, Secrétaire générale, administrateur. */
export function canManageAssemblies(v: NonNullable<Viewer>) {
  return v.isCA || v.isAdmin || v.roles.includes("SECRETAIRE_GENERALE");
}

/** Finances : le comptable et le Trésorier enregistrent ; les autres dirigeants, dont l'administrateur, consultent (lecture seule). */
export function canRecordFinances(v: NonNullable<Viewer>) {
  return v.isComptable || v.roles.includes("TRESORIER");
}

/** Numéros qui reçoivent l'argent des membres : pas le comptable, qui vérifie les paiements reçus. */
export const canManagePaymentAccounts = (v: NonNullable<Viewer>) => v.isCA || v.roles.includes("TRESORIER");

/** Statuts, art. 22 : le Trésorier (ou le Coordonnateur, poste vacant) signe les pièces de dépense, un membre du CA les vise. */
export const canSignExpenses = (v: NonNullable<Viewer>) => v.roles.includes("TRESORIER");
export const canApproveExpenses = (v: NonNullable<Viewer>) => v.isCA;

/** Budget : lignes générales par le comptable, le Trésorier ou le Coordonnateur ; lignes d'une commission aussi par ses responsables. */
export const canPrepareBudget = (v: NonNullable<Viewer>) => canRecordFinances(v) || v.roles.includes("COORDONNATEUR");
export const canEditBudgetLine = (v: NonNullable<Viewer>, commissionId: string | null) => canPrepareBudget(v) || (!!commissionId && v.commissionIds.includes(commissionId));
/** Adoption du budget : conseil d'administration. */
export const canAdoptBudget = (v: NonNullable<Viewer>) => v.isCA;

export async function requireFinances() {
  const v = await requireMember();
  if (!v.isDirigeant && !v.isComptable) redirect("/membre");
  return { ...v, canRecord: canRecordFinances(v), canSign: canSignExpenses(v), canApprove: canApproveExpenses(v) };
}

/** Décision sur les aides de solidarité : CA, bureau exécutif (dont le Trésorier), administrateur. */
export function canHandleSolidarity(v: NonNullable<Viewer>) {
  return v.isCA || v.isBureau || v.isAdmin;
}

export async function audit(actorId: string | null, action: string, target?: string, details?: unknown) {
  await db.insert(schema.auditLogs).values({ actorId, action, target, details: details as object | undefined });
}
