import "server-only";
import { count, db, desc, eq, gt, schema } from "@pride/db";
import { canVoteAtAG } from "@pride/shared";

type Member = typeof schema.members.$inferSelect;
export class ConsultationError extends Error {}

export async function createConsultation(input: { question: string; options: string[]; closesAt: Date }, actorId: string) {
  const [c] = await db.insert(schema.consultations).values({ ...input, createdBy: actorId }).returning();
  return c!;
}

/**
 * Vote anonyme : l'inscription du votant (qui empêche un deuxième vote) et le bulletin (le choix seul)
 * sont écrits dans la même transaction mais dans deux tables sans lien entre elles.
 */
export async function voteConsultation(member: Member, consultationId: string, option: number) {
  // Même règle que pour l'AG : membres actifs majeurs.
  if (!canVoteAtAG(member)) throw new ConsultationError("Seuls les membres actifs majeurs votent aux consultations.");
  const c = await db.query.consultations.findFirst({ where: eq(schema.consultations.id, consultationId) });
  if (!c) throw new ConsultationError("Consultation introuvable.");
  if (c.closesAt <= new Date()) throw new ConsultationError("Cette consultation est close.");
  if (!Number.isInteger(option) || option < 0 || option >= c.options.length) throw new ConsultationError("Choisissez une réponse.");
  await db.transaction(async (tx) => {
    const [voter] = await tx.insert(schema.consultationVoters).values({ consultationId, memberId: member.id }).onConflictDoNothing().returning();
    if (!voter) throw new ConsultationError("Vous avez déjà voté.");
    await tx.insert(schema.consultationBallots).values({ consultationId, option });
  });
}

/** Résultats : nombre et pourcentage de voix par réponse (arrondi à l'unité). */
export async function consultationResults(c: { id: string; options: string[] }) {
  const ballots = await db.select({ option: schema.consultationBallots.option, n: count() }).from(schema.consultationBallots).where(eq(schema.consultationBallots.consultationId, c.id)).groupBy(schema.consultationBallots.option);
  const total = ballots.reduce((s, b) => s + b.n, 0);
  return {
    total,
    rows: c.options.map((label, i) => {
      const n = ballots.find((b) => b.option === i)?.n ?? 0;
      return { label, n, pct: total ? Math.round((n * 100) / total) : 0 };
    }),
  };
}

export const openConsultations = () => db.query.consultations.findMany({ where: gt(schema.consultations.closesAt, new Date()), orderBy: desc(schema.consultations.createdAt) });
