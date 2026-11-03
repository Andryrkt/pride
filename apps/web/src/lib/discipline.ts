import "server-only";
import { and, count, db, desc, eq, isNull, schema } from "@pride/db";
import { addDays, localDay, MAX_HABITUDES, weekStart } from "@pride/shared";

export class DisciplineError extends Error {}

const TITLE_MAX = 160;
const REVIEW_MAX = 2000;

function title(raw: string, label: string) {
  const t = raw.trim();
  if (!t) throw new DisciplineError(`${label} : champ obligatoire.`);
  if (t.length > TITLE_MAX) throw new DisciplineError(`${label} : ${TITLE_MAX} caractères au maximum.`);
  return t;
}

export async function loadDiscipline(memberId: string) {
  const [habits, goals, reviews] = await Promise.all([
    db.query.habits.findMany({
      where: and(eq(schema.habits.memberId, memberId), isNull(schema.habits.stoppedAt)),
      orderBy: schema.habits.createdAt,
      with: { checks: true },
    }),
    db.query.goals.findMany({ where: eq(schema.goals.memberId, memberId), orderBy: desc(schema.goals.createdAt) }),
    db.query.reviews.findMany({ where: eq(schema.reviews.memberId, memberId), orderBy: desc(schema.reviews.periodStart), limit: 30 }),
  ]);
  return { habits, goals, reviews };
}

export async function addHabit(memberId: string, raw: string) {
  const t = title(raw, "Habitude");
  const [{ n }] = await db.select({ n: count() }).from(schema.habits).where(and(eq(schema.habits.memberId, memberId), isNull(schema.habits.stoppedAt)));
  if (n >= MAX_HABITUDES) throw new DisciplineError(`${MAX_HABITUDES} habitudes au maximum : arrêtez-en une pour en ajouter une autre.`);
  await db.insert(schema.habits).values({ memberId, title: t });
}

export async function stopHabit(memberId: string, habitId: string) {
  await db.update(schema.habits).set({ stoppedAt: new Date() }).where(and(eq(schema.habits.id, habitId), eq(schema.habits.memberId, memberId)));
}

/** Coche ou décoche le jour ou la veille (pour un oubli) ; les jours plus anciens ne se modifient pas. */
export async function toggleCheck(memberId: string, habitId: string, day: string) {
  const today = localDay();
  if (day !== today && day !== addDays(today, -1)) return;
  const habit = await db.query.habits.findFirst({ where: and(eq(schema.habits.id, habitId), eq(schema.habits.memberId, memberId), isNull(schema.habits.stoppedAt)) });
  if (!habit) return;
  const removed = await db.delete(schema.habitChecks).where(and(eq(schema.habitChecks.habitId, habitId), eq(schema.habitChecks.day, day))).returning();
  if (!removed.length) await db.insert(schema.habitChecks).values({ habitId, day }).onConflictDoNothing();
}

export async function addGoal(memberId: string, raw: string, dueOn: string) {
  const t = title(raw, "Objectif");
  if (dueOn) {
    const parsed = Date.parse(dueOn);
    // Le second test refuse les dates qui n'existent pas, comme le 31 février.
    if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== dueOn) throw new DisciplineError("Date limite invalide.");
    if (dueOn < localDay()) throw new DisciplineError("La date limite est déjà passée.");
  }
  await db.insert(schema.goals).values({ memberId, title: t, dueOn: dueOn || null });
}

export async function closeGoal(memberId: string, goalId: string, status: "ATTEINT" | "ABANDONNE") {
  await db
    .update(schema.goals)
    .set({ status, closedAt: new Date() })
    .where(and(eq(schema.goals.id, goalId), eq(schema.goals.memberId, memberId), eq(schema.goals.status, "EN_COURS")));
}

export const reviewPeriod = (kind: "JOUR" | "SEMAINE", today = localDay()) => (kind === "JOUR" ? today : weekStart(today));

/** Enregistre le bilan de la période en cours ; il se complète ou se corrige jusqu'à la fin de celle-ci. */
export async function saveReview(memberId: string, kind: "JOUR" | "SEMAINE", input: { wins: string; blocks: string; priority: string }) {
  const clean = (s: string) => s.trim() || null;
  const values = { wins: clean(input.wins), blocks: clean(input.blocks), priority: clean(input.priority) };
  const filled = Object.values(values).filter((x): x is string => x !== null);
  if (!filled.length) throw new DisciplineError("Répondez à au moins une question.");
  if (filled.some((x) => x.length > REVIEW_MAX)) throw new DisciplineError(`${REVIEW_MAX} caractères au maximum par réponse.`);
  await db
    .insert(schema.reviews)
    .values({ memberId, kind, periodStart: reviewPeriod(kind), ...values })
    .onConflictDoUpdate({ target: [schema.reviews.memberId, schema.reviews.kind, schema.reviews.periodStart], set: { ...values, updatedAt: new Date() } });
}
