import "server-only";
import { and, count, db, eq, gte, inArray, isNull, lte, or, schema } from "@pride/db";
import type { MandateRole } from "@pride/shared";
import { expenseList } from "./finances";
import { unreadForStaff } from "./messaging";
import type { Viewer } from "./session";
import { formatDate, formatDateTime } from "./utils";

export type Todo = { title: string; ref: string; href: string; cta: string };

/** Responsabilités de chaque rôle, affichées sur le tableau de bord (maquette « Tableau de bord » des dirigeants). */
export const DUTIES: Partial<Record<MandateRole, { ref: string; duties: string[] }>> = {
  PRESIDENT: { ref: "Statuts, art. 12 et 17", duties: ["Représenter l'association", "Convoquer l'AG et le conseil", "Agréer les adhésions avec le CA", "Viser les dépenses", "Adopter le budget annuel"] },
  VICE_PRESIDENT: { ref: "Statuts, art. 10 et 12", duties: ["Suppléer le Président", "Agréer les adhésions avec le CA", "Délibérer sur les exclusions", "Viser les dépenses", "Adopter le budget annuel"] },
  CONSEILLER: { ref: "Statuts, art. 10", duties: ["Agréer les adhésions (majorité des présents)", "Délibérer sur les exclusions (2/3 des présents)", "Viser les dépenses", "Adopter le budget annuel"] },
  COORDONNATEUR: { ref: "Statuts, art. 15 et 17", duties: ["Diriger le fonctionnement courant", "Coordonner les commissions", "Ordonner les dépenses du budget adopté", "Rendre compte au CA chaque année"] },
  SECRETAIRE_GENERALE: { ref: "Bureau exécutif, art. 14", duties: ["Tenir le registre des membres", "Envoyer les convocations", "Rédiger et archiver les procès-verbaux", "Gérer les documents officiels"] },
  TRESORIER: { ref: "Statuts, art. 20 à 23", duties: ["Tenir la comptabilité au jour le jour", "Signer les pièces de dépense", "Verser les aides accordées", "Présenter le rapport financier à l'AG"] },
  ADMIN_TECHNIQUE: { ref: "Désigné par le conseil d'administration", duties: ["Gérer les comptes et les rôles dans l'application", "Suppléer un poste vacant pour les opérations (signature des pièces)"] },
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Tâches du moment selon les rôles du dirigeant (l'administrateur voit celles de tous les rôles).
 * Chaque tâche n'apparaît que s'il y a quelque chose à faire.
 */
export async function leaderTodos(v: NonNullable<Viewer>): Promise<Todo[]> {
  const has = (...roles: MandateRole[]) => v.isAdmin || roles.some((r) => v.roles.includes(r));
  const ca = v.isAdmin || v.isCA;
  const sg = has("SECRETAIRE_GENERALE");
  const coord = has("COORDONNATEUR");
  const tres = has("TRESORIER");
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [applications, assemblies, exclusions, convs, [{ aids }], [{ offers }], [{ joins }], expenses, drafts, treasurer, pieces] = await Promise.all([
    db.select({ status: schema.applications.status, n: count() }).from(schema.applications).where(inArray(schema.applications.status, ["SOUMISE", "ENTRETIEN", "VOTE_CA", "AGREEE"])).groupBy(schema.applications.status),
    db.query.assemblies.findMany({ where: or(inArray(schema.assemblies.status, ["PREPARATION", "CONVOQUEE", "EN_SEANCE"]), and(eq(schema.assemblies.status, "CLOTUREE"), gte(schema.assemblies.closedAt, monthAgo))) }),
    db.query.exclusionProcedures.findMany({ where: eq(schema.exclusionProcedures.status, "OUVERTE"), with: { member: true } }),
    db.query.conversations.findMany({ where: eq(schema.conversations.lastSender, "MEMBRE") }),
    db.select({ aids: count() }).from(schema.solidarityRequests).where(eq(schema.solidarityRequests.status, "DEMANDEE")),
    db.select({ offers: count() }).from(schema.offers).where(eq(schema.offers.status, "PROPOSEE")),
    db.select({ joins: count() }).from(schema.commissionRequests).where(eq(schema.commissionRequests.status, "DEMANDEE")),
    db.select({ status: schema.expenses.status, n: count() }).from(schema.expenses).where(inArray(schema.expenses.status, ["A_SIGNER", "A_VISER", "A_PAYER"])).groupBy(schema.expenses.status),
    db.query.budgets.findMany({ where: eq(schema.budgets.status, "BROUILLON") }),
    db.query.mandates.findFirst({ where: and(eq(schema.mandates.role, "TRESORIER"), lte(schema.mandates.startsAt, now), or(isNull(schema.mandates.endsAt), gte(schema.mandates.endsAt, now))) }),
    tres ? expenseList() : null,
  ]);
  const apps = (s: string) => applications.find((a) => a.status === s)?.n ?? 0;
  const exp = (s: string) => expenses.find((e) => e.status === s)?.n ?? 0;
  const unread = (recipient: string) => convs.filter((c) => c.recipient === recipient && unreadForStaff(c)).length;
  const todos: Todo[] = [];
  const add = (cond: unknown, t: Todo) => cond && todos.push(t);

  // Secrétaire générale : registre, adhésions, AG et procès-verbaux, procédures, courrier du Secrétariat
  if (sg) {
    add(apps("SOUMISE") + apps("ENTRETIEN"), { title: `${plural(apps("SOUMISE") + apps("ENTRETIEN"), "candidature", "candidatures")} à instruire`, ref: "Parrainage, ou entretien avec 2 membres du CA", href: "/dirigeants/adhesions", cta: "Ouvrir" });
    add(apps("AGREEE"), { title: `${plural(apps("AGREEE"), "fiche membre", "fiches membre")} à créer`, ref: "Candidatures agréées par le CA", href: "/dirigeants/adhesions", cta: "Créer" });
    for (const a of assemblies) {
      if (a.status === "PREPARATION") add(true, { title: `Envoyer la convocation : ${a.title}`, ref: `${a.reference} · prévue le ${formatDateTime(a.scheduledAt)}`, href: `/dirigeants/ag/${a.id}`, cta: "Convoquer" });
      if (a.status === "CONVOQUEE" || a.status === "EN_SEANCE") add(true, { title: `Tenir la séance : ${a.title}`, ref: `${a.reference} · émargement, quorum et votes, le ${formatDateTime(a.scheduledAt)}`, href: `/dirigeants/ag/${a.id}`, cta: "Ouvrir" });
      if (a.status === "CLOTUREE") add(true, { title: `Imprimer et faire signer le PV : ${a.title}`, ref: `${a.reference} · clôturée le ${formatDate(a.closedAt)}`, href: `/dirigeants/ag/${a.id}`, cta: "Voir le PV" });
    }
    for (const x of exclusions.filter((x) => x.hearingAt > now)) {
      add(true, { title: `Audition de ${x.member.firstNames} ${x.member.lastName}`, ref: `Procédure d'exclusion · le ${formatDateTime(x.hearingAt)}`, href: `/dirigeants/membres/${x.memberId}`, cta: "Ouvrir" });
    }
    add(unread("SECRETARIAT"), { title: `${plural(unread("SECRETARIAT"), "message", "messages")} au Secrétariat général`, ref: "Messagerie des membres", href: "/dirigeants/messages", cta: "Répondre" });
  }

  // Conseil d'administration : agrément, exclusions, visa des dépenses, budget, bureau complet
  if (ca) {
    add(apps("VOTE_CA"), { title: `${plural(apps("VOTE_CA"), "candidature", "candidatures")} à agréer`, ref: "Vote du CA à la majorité des présents", href: "/dirigeants/adhesions", cta: "Voter" });
    for (const x of exclusions.filter((x) => x.hearingAt <= now)) {
      add(true, { title: `Délibérer sur l'exclusion de ${x.member.firstNames} ${x.member.lastName}`, ref: "Après l'audition · 2/3 des présents", href: `/dirigeants/membres/${x.memberId}`, cta: "Délibérer" });
    }
    add(exp("A_VISER"), { title: `${plural(exp("A_VISER"), "dépense", "dépenses")} à viser`, ref: "Pièces signées par le Trésorier, art. 22", href: "/finances/depenses", cta: "Viser" });
    for (const b of drafts) add(true, { title: `Adopter le budget ${b.year}${b.version > 1 ? " (rectificatif)" : ""}`, ref: "Brouillon préparé par le bureau et les commissions", href: `/finances/budget?annee=${b.year}`, cta: "Ouvrir" });
    add(!treasurer, { title: "Désigner un Trésorier", ref: "Bureau exécutif incomplet, art. 14 et 16", href: "/dirigeants/membres", cta: "Registre" });
  }

  if (coord) {
    add(joins, { title: `${plural(joins, "demande", "demandes")} d'entrée en commission`, ref: "Accepter ou refuser sur la page de la commission", href: "/dirigeants/commissions", cta: "Ouvrir" });
    for (const b of drafts) add(true, { title: `Compléter le budget ${b.year}`, ref: "Lignes générales et lignes des commissions", href: `/finances/budget?annee=${b.year}`, cta: "Ouvrir" });
    add(unread("COORDONNATEUR"), { title: `${plural(unread("COORDONNATEUR"), "message", "messages")} au Coordonnateur`, ref: "Messagerie des membres", href: "/dirigeants/messages", cta: "Répondre" });
  }

  if (tres) {
    add(exp("A_SIGNER"), { title: `${plural(exp("A_SIGNER"), "pièce", "pièces")} de dépense à signer`, ref: "Statuts, art. 22", href: "/finances/depenses", cta: "Signer" });
    add(exp("A_PAYER"), { title: `${plural(exp("A_PAYER"), "dépense visée", "dépenses visées")} à payer`, ref: "Écriture au journal au paiement", href: "/finances/depenses", cta: "Payer" });
    add(pieces?.aidsWithoutPiece.length, { title: `${plural(pieces?.aidsWithoutPiece.length ?? 0, "aide accordée", "aides accordées")} : pièce à préparer`, ref: "Aide de solidarité, RI art. 6", href: "/finances/depenses", cta: "Préparer" });
    add(unread("TRESORIER"), { title: `${plural(unread("TRESORIER"), "message", "messages")} au Trésorier`, ref: "Messagerie des membres", href: "/dirigeants/messages", cta: "Répondre" });
  }

  // Tous les dirigeants du CA et du bureau
  add((ca || v.isBureau) && aids, { title: `${plural(aids, "demande", "demandes")} d'aide de solidarité`, ref: "50 000 Ar au membre, 25 000 Ar à la famille", href: "/dirigeants/solidarite", cta: "Décider" });
  add(offers, { title: `${plural(offers, "offre", "offres")} de membre à valider`, ref: "Stages, emplois, bénévolat", href: "/dirigeants/offres", cta: "Valider" });

  return todos.filter((t, i) => todos.findIndex((o) => o.title === t.title) === i);
}
