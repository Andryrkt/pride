import "server-only";
import { and, asc, db, desc, eq, inArray, schema } from "@pride/db";
import { LEDGER_ACCOUNTS, type LedgerAccount } from "@pride/shared";
import { accountLabel, accountOf, journal } from "./finances";

export class BudgetError extends Error {}

/** Clé d'une ligne : un compte et une commission (vide = général). Elle relie les versions successives du budget. */
const keyOf = (account: string | null, commissionId: string | null) => `${account ?? ""}|${commissionId ?? ""}`;
const directionOf = (account: string) => LEDGER_ACCOUNTS[account as LedgerAccount]?.[1] ?? "DEPENSE";

/** Budgets d'une année : celui en vigueur (dernier adopté), le brouillon éventuel et l'historique des versions. */
export async function budgetsOf(year: number) {
  const all = await db.query.budgets.findMany({
    where: eq(schema.budgets.year, year),
    orderBy: desc(schema.budgets.version),
    with: { lines: { with: { commission: true }, orderBy: [asc(schema.budgetLines.account), asc(schema.budgetLines.createdAt)] } },
  });
  return { adopted: all.find((b) => b.status === "ADOPTE"), draft: all.find((b) => b.status === "BROUILLON"), history: all };
}

/** Nouveau brouillon ; s'il existe déjà un budget adopté, c'est un rectificatif qui en reprend les lignes. */
export async function createBudget(year: number, actorId: string) {
  const { adopted, draft, history } = await budgetsOf(year);
  if (draft) throw new BudgetError("Un brouillon est déjà en préparation pour cette année.");
  return db.transaction(async (tx) => {
    const [budget] = await tx.insert(schema.budgets).values({ year, version: (history[0]?.version ?? 0) + 1, createdBy: actorId }).onConflictDoNothing().returning();
    if (!budget) throw new BudgetError("Un brouillon vient d'être créé par quelqu'un d'autre : rechargez la page.");
    if (adopted?.lines.length) {
      await tx.insert(schema.budgetLines).values(adopted.lines.map((l) => ({ budgetId: budget.id, account: l.account, commissionId: l.commissionId, label: l.label, amount: l.amount, createdBy: actorId })));
    }
    return budget;
  });
}

async function draftOf(budgetId: string) {
  const budget = await db.query.budgets.findFirst({ where: eq(schema.budgets.id, budgetId) });
  if (budget?.status !== "BROUILLON") throw new BudgetError("Ce budget est adopté : il ne se modifie plus. Préparez un budget rectificatif.");
  return budget;
}

/** Ajoute une ligne, ou met à jour le montant de la ligne existante pour ce compte et cette commission. */
export async function saveLine(budgetId: string, l: { account: LedgerAccount; commissionId: string | null; label: string; amount: number }, actorId: string) {
  if (!(l.account in LEDGER_ACCOUNTS)) throw new BudgetError("Compte inconnu.");
  if (!Number.isInteger(l.amount) || l.amount <= 0) throw new BudgetError("Le montant doit être un nombre entier d'ariary, supérieur à zéro.");
  await draftOf(budgetId);
  const lines = await db.query.budgetLines.findMany({ where: and(eq(schema.budgetLines.budgetId, budgetId), eq(schema.budgetLines.account, l.account)) });
  const existing = lines.find((x) => x.commissionId === l.commissionId);
  if (existing) {
    const [row] = await db.update(schema.budgetLines).set({ amount: l.amount, label: l.label || existing.label }).where(eq(schema.budgetLines.id, existing.id)).returning();
    return { line: row!, updated: true };
  }
  const [row] = await db.insert(schema.budgetLines).values({ budgetId, ...l, label: l.label || null, createdBy: actorId }).returning();
  return { line: row!, updated: false };
}

export async function removeLine(lineId: string) {
  const line = await db.query.budgetLines.findFirst({ where: eq(schema.budgetLines.id, lineId) });
  if (!line) throw new BudgetError("Ligne introuvable.");
  await draftOf(line.budgetId);
  await db.delete(schema.budgetLines).where(eq(schema.budgetLines.id, lineId));
  return line;
}

/** Adoption par le CA : le brouillon devient le budget en vigueur, l'ancien est « remplacé ». */
export async function adoptBudget(budgetId: string, meetingDate: Date, actorId: string) {
  if (meetingDate > new Date()) throw new BudgetError("La date de la réunion du CA ne peut pas être dans le futur.");
  const budget = await db.query.budgets.findFirst({ where: eq(schema.budgets.id, budgetId), with: { lines: true } });
  if (budget?.status !== "BROUILLON") throw new BudgetError("Ce budget n'est pas un brouillon.");
  if (!budget.lines.length) throw new BudgetError("Le budget n'a aucune ligne.");
  return db.transaction(async (tx) => {
    await tx.update(schema.budgets).set({ status: "REMPLACE" }).where(and(eq(schema.budgets.year, budget.year), eq(schema.budgets.status, "ADOPTE")));
    const [row] = await tx
      .update(schema.budgets)
      .set({ status: "ADOPTE", adoptedOn: meetingDate, adoptedBy: actorId })
      .where(and(eq(schema.budgets.id, budgetId), eq(schema.budgets.status, "BROUILLON")))
      .returning();
    if (!row) throw new BudgetError("Ce budget vient d'être adopté par quelqu'un d'autre.");
    return row;
  });
}

/**
 * Suivi du budget en vigueur : pour chaque ligne, le prévu, le réalisé (journal, net des rectifications),
 * l'engagé (pièces de dépense en cours) et le reste. Les écritures sans ligne prévue apparaissent « hors budget ».
 */
export async function budgetFollowUp(year: number) {
  const [{ adopted }, entries, expenses] = await Promise.all([
    budgetsOf(year),
    journal(year),
    db.query.expenses.findMany({ where: inArray(schema.expenses.status, ["A_SIGNER", "A_VISER", "A_PAYER", "PAYEE"]), with: { line: true } }),
  ]);
  const commissionOfEntry = new Map(expenses.flatMap((e) => (e.ledgerEntryId ? [[e.ledgerEntryId, e.line?.commissionId ?? null] as const] : [])));
  const realised = new Map<string, number>();
  for (const e of entries) {
    const account = accountOf(e);
    if (!account) continue;
    // Écritures antérieures à la colonne « commission » : celle de la ligne budgétaire de leur pièce.
    const k = keyOf(account, e.commissionId ?? commissionOfEntry.get(e.correctsId ?? e.id) ?? null);
    realised.set(k, (realised.get(k) ?? 0) + (e.direction === directionOf(account) ? e.amount : -e.amount));
  }
  const committed = new Map<string, number>();
  for (const e of expenses) {
    if (e.status === "PAYEE" || e.createdAt.getFullYear() !== year) continue;
    const k = keyOf(e.account, e.line?.commissionId ?? null);
    committed.set(k, (committed.get(k) ?? 0) + e.amount);
  }

  const lines = (adopted?.lines ?? []).map((l) => {
    const k = keyOf(l.account, l.commissionId);
    const real = realised.get(k) ?? 0;
    const engage = committed.get(k) ?? 0;
    return { id: l.id, key: k, account: l.account, direction: directionOf(l.account), accountLabel: accountLabel(l.account), commissionId: l.commissionId, commission: l.commission?.name ?? "Général", label: l.label, prevu: l.amount, realise: real, engage, reste: l.amount - real - engage };
  });
  const planned = new Set(lines.map((l) => l.key));
  const outside = [...new Set([...realised.keys(), ...committed.keys()])]
    .filter((k) => !planned.has(k))
    .map((k) => {
      const [account, commissionId] = k.split("|");
      return { key: k, account: account!, direction: directionOf(account!), accountLabel: accountLabel(account!), commissionId: commissionId || null, realise: realised.get(k) ?? 0, engage: committed.get(k) ?? 0 };
    })
    .filter((o) => o.realise || o.engage);
  return { adopted, lines, outside };
}

/** Reste sur une ligne du budget ; `exceptAmount` : montant d'une pièce en cours déjà comptée dans l'engagé, à ne pas compter. */
export async function remainingOnLine(lineId: string, year: number, exceptAmount = 0) {
  const { lines } = await budgetFollowUp(year);
  const line = await db.query.budgetLines.findFirst({ where: eq(schema.budgetLines.id, lineId) });
  const k = line && keyOf(line.account, line.commissionId);
  const l = lines.find((x) => x.key === k);
  return l ? l.reste + exceptAmount : null;
}

/** Suivi en CSV (séparateur « ; », BOM pour Excel), pour le rapport financier de l'AG. */
export async function budgetCsv(year: number) {
  const { adopted, lines, outside } = await budgetFollowUp(year);
  const cell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const out = [[`Budget ${year}${adopted ? ` · version ${adopted.version}` : " · aucun budget adopté"}`].map(cell).join(";"), ["Sens", "Compte", "Commission", "Description", "Prévu (Ar)", "Réalisé (Ar)", "Engagé (Ar)", "Reste (Ar)"].map(cell).join(";")];
  for (const l of lines) out.push([l.direction === "RECETTE" ? "Recette" : "Dépense", l.accountLabel, l.commission, l.label ?? "", l.prevu, l.realise, l.engage, l.reste].map(cell).join(";"));
  for (const o of outside) out.push([o.direction === "RECETTE" ? "Recette" : "Dépense", o.accountLabel, "Hors budget", "", 0, o.realise, o.engage, -o.realise - o.engage].map(cell).join(";"));
  return "﻿" + out.join("\r\n");
}
