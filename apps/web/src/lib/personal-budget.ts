import "server-only";
import { and, asc, db, eq, gte, lt, schema } from "@pride/db";
import { BUDGET_CATEGORIES, localDay, shiftMonth } from "@pride/shared";

/** « Mon budget » : données personnelles, lues et modifiées seulement pour le membre connecté (aucune page dirigeant). */
export class PersonalBudgetError extends Error {}

const MAX_AMOUNT = 1_000_000_000;
const LABEL_MAX = 120;

/** Mois « AAAA-MM » valide, sinon le mois en cours (fuseau de Madagascar). */
export function monthParam(raw?: string) {
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : localDay().slice(0, 7);
}

export async function loadMonth(memberId: string, month: string) {
  const [entries, goal] = await Promise.all([
    db.query.personalBudgetEntries.findMany({
      where: and(eq(schema.personalBudgetEntries.memberId, memberId), gte(schema.personalBudgetEntries.day, `${month}-01`), lt(schema.personalBudgetEntries.day, `${shiftMonth(month, 1)}-01`)),
      orderBy: [asc(schema.personalBudgetEntries.day), asc(schema.personalBudgetEntries.createdAt)],
    }),
    db.query.personalBudgetGoals.findFirst({ where: eq(schema.personalBudgetGoals.memberId, memberId) }),
  ]);
  return { entries, goal: goal?.monthlySaving ?? null };
}

function amountOf(raw: string) {
  const n = Number(raw.replace(/[\s ]/g, ""));
  if (!Number.isInteger(n) || n <= 0 || n > MAX_AMOUNT) throw new PersonalBudgetError("Montant invalide : un nombre entier d'ariary, sans virgule.");
  return n;
}

export async function addEntry(memberId: string, input: { category: string; amount: string; day: string; label: string }) {
  if (!(input.category in BUDGET_CATEGORIES)) throw new PersonalBudgetError("Choisissez une catégorie.");
  const amount = amountOf(input.amount);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day) || Number.isNaN(new Date(input.day).getTime())) throw new PersonalBudgetError("Date invalide.");
  if (input.day > localDay()) throw new PersonalBudgetError("La date ne peut pas être dans le futur.");
  const label = input.label.trim();
  if (label.length > LABEL_MAX) throw new PersonalBudgetError(`Libellé : ${LABEL_MAX} caractères au maximum.`);
  await db.insert(schema.personalBudgetEntries).values({ memberId, category: input.category, amount, day: input.day, label: label || null });
}

/** Une ligne du membre (et de lui seul) ; ce n'est pas la comptabilité de l'association, on peut donc la supprimer. */
export async function deleteEntry(memberId: string, id: string) {
  await db.delete(schema.personalBudgetEntries).where(and(eq(schema.personalBudgetEntries.id, id), eq(schema.personalBudgetEntries.memberId, memberId)));
}

/** Objectif d'épargne du mois ; 0 ou vide le retire. */
export async function setSavingGoal(memberId: string, raw: string) {
  const cleaned = raw.replace(/[\s ]/g, "");
  if (!cleaned || cleaned === "0") {
    await db.delete(schema.personalBudgetGoals).where(eq(schema.personalBudgetGoals.memberId, memberId));
    return null;
  }
  const monthlySaving = amountOf(cleaned);
  await db
    .insert(schema.personalBudgetGoals)
    .values({ memberId, monthlySaving })
    .onConflictDoUpdate({ target: schema.personalBudgetGoals.memberId, set: { monthlySaving, updatedAt: new Date() } });
  return monthlySaving;
}
