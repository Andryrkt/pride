"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@pride/db";
import { agrementSchema } from "@pride/shared";
import { ApplicationError, createMemberFromApplication, recordDecision, scheduleInterview, sendToVote } from "@/lib/applications";
import { addCommissionMember, CommissionError, designateResponsable, endResponsableMandate, removeCommissionMember } from "@/lib/commissions";
import { audit, canDecideApplications, canHandleSolidarity, canManageCommissions, requireDirigeant } from "@/lib/session";
import { decideSolidarity, SolidarityError } from "@/lib/solidarity";
import { slugify, type FormState } from "@/lib/utils";

async function guard() {
  const v = await requireDirigeant();
  if (!canDecideApplications(v)) throw new ApplicationError("Action réservée au conseil d'administration et au Secrétariat général.");
  return v;
}

function fail(e: unknown): FormState {
  return { ok: false, message: e instanceof Error ? e.message : "Action impossible." };
}

export async function sendToVoteAction(id: string, _p: FormState): Promise<FormState> {
  try {
    const v = await guard();
    await sendToVote(id);
    await audit(v.member.id, "candidature.vote", id);
  } catch (e) { return fail(e); }
  revalidatePath(`/dirigeants/adhesions/${id}`);
  redirect(`/dirigeants/adhesions/${id}?ok=${encodeURIComponent("Candidature inscrite à l'ordre du jour du conseil.")}`);
}

export async function interviewAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  try {
    const v = await guard();
    const at = new Date(String(f.get("interviewAt")));
    if (Number.isNaN(at.getTime())) return { ok: false, message: "Date d'entretien invalide." };
    await scheduleInterview(id, at);
    await audit(v.member.id, "candidature.entretien", id, { at });
  } catch (e) { return fail(e); }
  revalidatePath(`/dirigeants/adhesions/${id}`);
  return { ok: true, message: "Entretien planifié." };
}

export async function decisionAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  let adopted = false;
  try {
    const v = await guard();
    const parsed = agrementSchema.safeParse(Object.fromEntries(f));
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
    adopted = await recordDecision(id, parsed.data, v.member.id);
    await audit(v.member.id, "candidature.deliberation", id, parsed.data);
  } catch (e) { return fail(e); }
  revalidatePath(`/dirigeants/adhesions/${id}`);
  redirect(`/dirigeants/adhesions/${id}?ok=${encodeURIComponent(adopted ? "Adhésion agréée par le conseil." : "Majorité non atteinte : candidature refusée.")}`);
}

export async function createMemberAction(id: string, _p: FormState): Promise<FormState> {
  let memberNumber = "";
  try {
    const v = await guard();
    const m = await createMemberFromApplication(id, v.member.id);
    memberNumber = m.number;
  } catch (e) { return fail(e); }
  revalidatePath(`/dirigeants/adhesions/${id}`);
  redirect(`/dirigeants/adhesions/${id}?ok=${encodeURIComponent(`Fiche membre ${memberNumber} créée. Droit d'entrée et première cotisation à payer.`)}`);
}

export async function publishPostAction(_p: FormState, f: FormData): Promise<FormState> {
  const v = await requireDirigeant();
  const title = String(f.get("title") ?? "").trim();
  const body = String(f.get("body") ?? "").trim();
  const type = String(f.get("type")) as "ARTICLE" | "EVENEMENT" | "ANNONCE";
  const visibility = f.get("visibility") === "MEMBRES" ? "MEMBRES" : "PUBLIC";
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Titre : champ obligatoire";
  if (!body) errors.body = "Texte : champ obligatoire";
  const eventAtRaw = String(f.get("eventAt") ?? "");
  if (type === "EVENEMENT" && !eventAtRaw) errors.eventAt = "Date de l'événement : obligatoire";
  if (Object.keys(errors).length) return { ok: false, message: "Vérifiez les champs indiqués.", errors };
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  await db.insert(schema.posts).values({
    slug,
    type,
    title,
    body,
    excerpt: body.split("\n")[0]!.slice(0, 240),
    visibility,
    eventAt: type === "EVENEMENT" ? new Date(eventAtRaw) : null,
    location: String(f.get("location") ?? "") || null,
    authorId: v.member.id,
  });
  await audit(v.member.id, "actualite.publication", slug, { visibility });
  revalidatePath("/actualites");
  revalidatePath("/membre/actualites");
  redirect("/dirigeants/actualites?publie=1");
}

// ---------------------------------------------------------------------------
// Commissions : responsables désignés pour un an, composition des équipes
// ---------------------------------------------------------------------------

async function commissionGuard() {
  const v = await requireDirigeant();
  if (!canManageCommissions(v)) throw new CommissionError("Action réservée au conseil d'administration et au Coordonnateur.");
  return v;
}

export async function designateResponsableAction(commissionId: string, slug: string, _p: FormState, f: FormData): Promise<FormState> {
  const memberId = String(f.get("responsableId") ?? "");
  const startsRaw = String(f.get("startsAt") ?? "");
  const errors: Record<string, string> = {};
  if (!memberId) errors.responsableId = "Responsable : champ obligatoire";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsRaw)) errors.startsAt = "Début du mandat : champ obligatoire";
  if (Object.keys(errors).length) return { ok: false, message: "Vérifiez les champs indiqués.", errors };
  try {
    const v = await commissionGuard();
    const { mandate, replaced } = await designateResponsable(commissionId, memberId, new Date(startsRaw));
    await audit(v.member.id, "commission.responsable", commissionId, { memberId, mandateId: mandate.id, startsAt: startsRaw, replaced });
  } catch (e) { return fail(e); }
  revalidatePath("/dirigeants/commissions");
  revalidatePath("/association");
  redirect(`/dirigeants/commissions/${slug}?ok=${encodeURIComponent("Responsable désigné pour un an.")}`);
}

export async function endMandateAction(mandateId: string, slug: string, _p: FormState): Promise<FormState> {
  try {
    const v = await commissionGuard();
    const m = await endResponsableMandate(mandateId);
    await audit(v.member.id, "commission.fin_mandat", m.commissionId ?? undefined, { mandateId, memberId: m.memberId });
  } catch (e) { return fail(e); }
  revalidatePath("/dirigeants/commissions");
  revalidatePath("/association");
  redirect(`/dirigeants/commissions/${slug}?ok=${encodeURIComponent("Mandat terminé : la commission n'a plus de responsable.")}`);
}

export async function addCommissionMemberAction(commissionId: string, slug: string, _p: FormState, f: FormData): Promise<FormState> {
  const memberId = String(f.get("memberId") ?? "");
  if (!memberId) return { ok: false, message: "Vérifiez les champs indiqués.", errors: { memberId: "Membre : champ obligatoire" } };
  try {
    const v = await commissionGuard();
    await addCommissionMember(commissionId, memberId);
    await audit(v.member.id, "commission.ajout_membre", commissionId, { memberId });
  } catch (e) { return fail(e); }
  revalidatePath(`/dirigeants/commissions/${slug}`);
  redirect(`/dirigeants/commissions/${slug}?ok=${encodeURIComponent("Membre ajouté à la commission.")}`);
}

export async function removeCommissionMemberAction(commissionId: string, memberId: string, slug: string, _p: FormState): Promise<FormState> {
  try {
    const v = await commissionGuard();
    await removeCommissionMember(commissionId, memberId);
    await audit(v.member.id, "commission.retrait_membre", commissionId, { memberId });
  } catch (e) { return fail(e); }
  revalidatePath(`/dirigeants/commissions/${slug}`);
  redirect(`/dirigeants/commissions/${slug}?ok=${encodeURIComponent("Membre retiré de la commission.")}`);
}

// ---------------------------------------------------------------------------
// Aide de solidarité (RI art. 6)
// ---------------------------------------------------------------------------

export async function decideSolidarityAction(id: string, decision: "ACCORDEE" | "REFUSEE", _p: FormState, f: FormData): Promise<FormState> {
  const note = String(f.get("note") ?? "").trim();
  if (decision === "REFUSEE" && !note) return { ok: false, message: "Indiquez le motif du refus : il est envoyé au membre.", errors: { note: "Motif : obligatoire pour un refus" } };
  try {
    const v = await requireDirigeant();
    if (!canHandleSolidarity(v)) throw new SolidarityError("Action réservée au conseil d'administration et au bureau exécutif.");
    const r = await decideSolidarity(id, decision, note, v.member.id);
    await audit(v.member.id, decision === "ACCORDEE" ? "solidarite.accord" : "solidarite.refus", id, { memberId: r.memberId, amount: r.amount, note });
  } catch (e) { return fail(e); }
  revalidatePath("/dirigeants/solidarite");
  redirect(`/dirigeants/solidarite?ok=${encodeURIComponent(decision === "ACCORDEE" ? "Aide accordée : le membre est prévenu par e-mail." : "Demande refusée : le membre est prévenu par e-mail.")}`);
}
