"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, db, eq, schema } from "@pride/db";
import { cvSchema, MAX_UPLOAD_BYTES, ticketSchema, MESSAGE_RECIPIENTS, type MessageRecipient, offerSchema, paymentRequestSchema, profileSchema, proposalSchema, solidarityRequestSchema } from "@pride/shared";
import { declarePayment, PaymentError } from "@/lib/dues";
import { audit, requireMember } from "@/lib/session";
import { archiveResource, canPublishResources, publishResource, ResourceError, updateResource } from "@/lib/resources";
import { validateFile } from "@/lib/applications";
import { declareSolidarity, SolidarityError } from "@/lib/solidarity";
import { askHelp, closeOffer, expressInterest, NetworkError, proposeOffer, requestCommission, sendProposal } from "@/lib/network";
import { handOff, HUMAN_RECIPIENTS, MENU_CHIPS, MessagingError, postMemberMessage } from "@/lib/messaging";
import { ConsultationError, voteConsultation } from "@/lib/consultations";
import { addGoal, addHabit, closeGoal, DisciplineError, saveReview, stopHabit, toggleCheck } from "@/lib/discipline";
import { PhotoError, setMemberPhoto } from "@/lib/photo";
import { addEntry, deleteEntry, PersonalBudgetError, setSavingGoal } from "@/lib/personal-budget";
import type { FormState } from "@/lib/utils";
import { saveCv } from "@/lib/cv";
import { createTicket, ticketRef, TicketError } from "@/lib/tickets";
import { headers } from "next/headers";

export async function declarePaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const dueIds = formData.getAll("due").map(String);
  const data = { phone: String(formData.get("phone") ?? ""), reference: String(formData.get("reference") ?? "") };
  const parsed = paymentRequestSchema.safeParse({ dueIds, provider: formData.get("provider"), ...data });
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  const file = formData.get("proof");
  const hasFile = file instanceof File && file.size > 0;
  const fileProblem = hasFile ? validateFile(file) : null;
  if (fileProblem) errors.proof = fileProblem;
  if (!parsed.success || fileProblem) return { ok: false, message: Object.values(errors)[0], errors, data };
  try {
    await declarePayment({ memberId: v.member.id, ...parsed.data }, hasFile ? file : undefined);
  } catch (e) {
    if (e instanceof PaymentError) return { ok: false, message: e.message, data };
    throw e;
  }
  revalidatePath("/membre");
  redirect("/membre/cotisations?attente=1");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const raw = {
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    profession: String(formData.get("profession") ?? "") || undefined,
    skills: String(formData.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    shareSkills: formData.get("shareSkills") === "on",
  };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Vérifiez les champs indiqués.", errors };
  }
  await db.update(schema.members).set(parsed.data).where(eq(schema.members.id, v.member.id));
  revalidatePath("/membre/profil");
  return { ok: true, message: "Profil enregistré." };
}

/** Inscription (ou désinscription) à un événement ou une formation ; une formation complète refuse les nouvelles inscriptions. */
export async function toggleRegistration(postId: string) {
  const v = await requireMember();
  await db.transaction(async (tx) => {
    // Verrou sur la publication : deux inscriptions simultanées ne dépassent pas le nombre de places.
    const [post] = await tx.select().from(schema.posts).where(eq(schema.posts.id, postId)).for("update");
    if (!post) return;
    const mine = and(eq(schema.eventRegistrations.postId, postId), eq(schema.eventRegistrations.memberId, v.member.id));
    const [existing] = await tx.select().from(schema.eventRegistrations).where(mine);
    if (existing) {
      await tx.delete(schema.eventRegistrations).where(eq(schema.eventRegistrations.id, existing.id));
      return;
    }
    if (post.capacity != null) {
      const [{ n }] = await tx.select({ n: count() }).from(schema.eventRegistrations).where(eq(schema.eventRegistrations.postId, postId));
      if (n >= post.capacity) return;
    }
    await tx.insert(schema.eventRegistrations).values({ postId, memberId: v.member.id });
  });
  revalidatePath("/membre/actualites");
  revalidatePath("/membre/formations");
}

export async function declareSolidarityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const data = Object.fromEntries(["kind", "concerns", "eventDate", "message"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = solidarityRequestSchema.safeParse({ ...data, eventDate: data.eventDate || undefined });
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  const file = formData.get("attachment");
  const hasFile = file instanceof File && file.size > 0;
  const fileProblem = hasFile ? validateFile(file) : null;
  if (fileProblem) errors.attachment = fileProblem;
  if (!parsed.success || fileProblem) return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  try {
    await declareSolidarity(v.member, parsed.data, hasFile ? file : undefined);
  } catch (e) {
    if (e instanceof SolidarityError) return { ok: false, message: e.message, data };
    throw e;
  }
  revalidatePath("/membre");
  return { ok: true, message: "Demande transmise au Trésorier et à la Commission sociale. Vous serez contacté(e) rapidement." };
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Photo d'identité de la carte de membre, ajoutée ou changée par le membre depuis son profil. */
export async function updatePhoto(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choisissez une photo.", errors: { photo: "Photo : champ obligatoire" } };
  if (!PHOTO_TYPES.includes(file.type)) return { ok: false, message: "Format accepté : JPG, PNG ou WEBP.", errors: { photo: "Format accepté : JPG, PNG ou WEBP" } };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: "Photo trop lourde (5 Mo maximum).", errors: { photo: "Photo trop lourde (5 Mo maximum)" } };
  try {
    await setMemberPhoto(v.member.id, file);
  } catch (e) {
    if (e instanceof PhotoError) return { ok: false, message: e.message, errors: { photo: e.message } };
    throw e;
  }
  revalidatePath("/membre", "layout");
  return { ok: true, message: "Photo enregistrée. Elle apparaît sur votre carte de membre." };
}

// ---------------------------------------------------------------------------
// Réseau : offres, coups de main, commissions, propositions
// ---------------------------------------------------------------------------

async function network(run: () => Promise<unknown>, ok: string, paths: string[]): Promise<FormState> {
  try {
    await run();
  } catch (e) {
    if (e instanceof NetworkError) return { ok: false, message: e.message };
    throw e;
  }
  for (const p of paths) revalidatePath(p);
  return { ok: true, message: ok };
}

const fieldErrors = (issues: { path: (string | number)[]; message: string }[]) => {
  const errors: Record<string, string> = {};
  for (const i of issues) errors[String(i.path[0])] ??= i.message;
  return errors;
};

export async function proposeOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const data = Object.fromEntries(["type", "title", "description", "location"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = offerSchema.safeParse({ ...data, location: data.location || undefined });
  if (!parsed.success) return { ok: false, message: "Vérifiez les champs indiqués.", errors: fieldErrors(parsed.error.issues), data };
  return network(() => proposeOffer(v.member, parsed.data), "Merci ! Votre offre sera visible dès qu'un dirigeant l'aura validée.", ["/membre/formations"]);
}

export async function interestAction(offerId: string, _prev: FormState): Promise<FormState> {
  const v = await requireMember();
  return network(() => expressInterest(offerId, v.member), "Vos coordonnées ont été transmises à l'auteur de l'offre.", ["/membre/formations"]);
}

export async function closeOfferAction(offerId: string, _prev: FormState): Promise<FormState> {
  const v = await requireMember();
  return network(() => closeOffer(offerId, { memberId: v.member.id, isLeader: v.isDirigeant }), "Offre clôturée.", ["/membre/formations", "/membre"]);
}

export async function askHelpAction(toId: string, _prev: FormState): Promise<FormState> {
  const v = await requireMember();
  return network(() => askHelp(v.member, toId), "Demande envoyée.", ["/membre/competences"]);
}

export async function requestCommissionAction(commissionId: string, _prev: FormState): Promise<FormState> {
  const v = await requireMember();
  return network(() => requestCommission(v.member, commissionId), "Demande envoyée.", ["/membre/competences"]);
}

export async function proposalAction(kind: "ATELIER" | "PROJET", _prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const data = { title: String(formData.get("title") ?? ""), details: String(formData.get("details") ?? "") };
  const parsed = proposalSchema.safeParse({ kind, ...data });
  if (!parsed.success) return { ok: false, message: "Vérifiez les champs indiqués.", errors: fieldErrors(parsed.error.issues), data };
  return network(
    () => sendProposal(v.member, parsed.data),
    kind === "ATELIER" ? "Merci ! Proposition transmise à la Commission formation et projets." : "Idée transmise à la Commission formation et projets, puis au conseil d'administration pour validation.",
    [kind === "ATELIER" ? "/membre/formations" : "/membre/competences", "/dirigeants/propositions"],
  );
}

// ---------------------------------------------------------------------------
// Messagerie
// ---------------------------------------------------------------------------

const isRecipient = (r: string): r is MessageRecipient => r in MESSAGE_RECIPIENTS;

/** Message écrit (avec pièce jointe facultative) ou bouton de réponse rapide de l'assistant. */
export async function sendMessageAction(recipient: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  if (!isRecipient(recipient)) return { ok: false, message: "Destinataire inconnu." };
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const file = formData.get("attachment");
  const hasFile = file instanceof File && file.size > 0;
  if (!body && !hasFile) return { ok: false, message: "Écrivez un message." };
  try {
    await postMemberMessage(v.member, recipient, body || "Pièce jointe", hasFile ? file : undefined);
  } catch (e) {
    if (e instanceof MessagingError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/membre", "layout");
  return { ok: true };
}

/** Bouton de réponse rapide de l'assistant (« Ma cotisation »…). */
export async function quickReplyAction(question: string) {
  const v = await requireMember();
  if (!MENU_CHIPS.includes(question)) return;
  await postMemberMessage(v.member, "ASSISTANT", question);
  revalidatePath("/membre", "layout");
}

export async function handOffAction(recipient: string) {
  const v = await requireMember();
  const target = HUMAN_RECIPIENTS.find((r) => r === recipient);
  if (!target) return;
  await handOff(v.member, target);
  revalidatePath("/membre", "layout");
}

export async function voteConsultationAction(consultationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const raw = formData.get("option");
  if (raw === null) return { ok: false, message: "Choisissez une réponse." };
  try {
    await voteConsultation(v.member, consultationId, Number(raw));
  } catch (e) {
    if (e instanceof ConsultationError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/membre", "layout");
  return { ok: true, message: "Merci, votre vote est enregistré." };
}

// Autodiscipline : chaque action ne touche que les données du membre connecté.
async function disciplineAction(fn: (memberId: string) => Promise<unknown>, message: string): Promise<FormState> {
  const v = await requireMember();
  try {
    await fn(v.member.id);
  } catch (e) {
    if (e instanceof DisciplineError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/membre/discipline");
  revalidatePath("/membre");
  return { ok: true, message };
}

export async function addHabitAction(_p: FormState, f: FormData): Promise<FormState> {
  return disciplineAction((id) => addHabit(id, String(f.get("title") ?? "")), "Habitude ajoutée.");
}

export async function addGoalAction(_p: FormState, f: FormData): Promise<FormState> {
  return disciplineAction((id) => addGoal(id, String(f.get("title") ?? ""), String(f.get("dueOn") ?? "")), "Objectif ajouté.");
}

export async function saveReviewAction(kind: "JOUR" | "SEMAINE", _p: FormState, f: FormData): Promise<FormState> {
  const text = (k: string) => String(f.get(k) ?? "");
  return disciplineAction((id) => saveReview(id, kind, { wins: text("wins"), blocks: text("blocks"), priority: text("priority") }), "Bilan enregistré.");
}

export async function toggleCheckAction(habitId: string, day: string) {
  const v = await requireMember();
  await toggleCheck(v.member.id, habitId, day);
  revalidatePath("/membre/discipline");
  revalidatePath("/membre");
}

export async function stopHabitAction(habitId: string) {
  const v = await requireMember();
  await stopHabit(v.member.id, habitId);
  revalidatePath("/membre/discipline");
  revalidatePath("/membre");
}

export async function closeGoalAction(goalId: string, status: "ATTEINT" | "ABANDONNE") {
  const v = await requireMember();
  await closeGoal(v.member.id, goalId, status);
  revalidatePath("/membre/discipline");
}

// ---------------------------------------------------------------------------
// Ressources de l'espace « Apprendre » (responsables de la Commission formation et projets, Secrétaire générale, administrateur)
// ---------------------------------------------------------------------------

async function resourcePublisher() {
  const v = await requireMember();
  if (!(await canPublishResources(v))) throw new ResourceError("Publication réservée aux responsables de la Commission formation et projets, à la Secrétaire générale et à l'administrateur.");
  return v;
}

export async function publishResourceAction(_p: FormState, f: FormData): Promise<FormState> {
  const get = (k: string) => String(f.get(k) ?? "");
  const file = f.get("file");
  let id = "";
  try {
    const v = await resourcePublisher();
    const r = await publishResource({ theme: get("theme"), title: get("title"), summary: get("summary"), body: get("body"), videoUrl: get("videoUrl"), visibility: f.get("vitrine") === "on" ? "PUBLIC" : "MEMBRES" }, file instanceof File ? file : null, v.member.id);
    await audit(v.member.id, "ressource.publication", r.id, { title: r.title, visibility: r.visibility });
    id = r.id;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Publication impossible." };
  }
  revalidatePath("/membre/ressources");
  revalidatePath("/ressources");
  redirect(`/membre/ressources/${id}?ok=${encodeURIComponent("Ressource publiée.")}`);
}

export async function updateResourceAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  const get = (k: string) => String(f.get(k) ?? "");
  const file = f.get("file");
  try {
    const v = await resourcePublisher();
    const r = await updateResource(id, { theme: get("theme"), title: get("title"), summary: get("summary"), body: get("body"), videoUrl: get("videoUrl"), visibility: f.get("vitrine") === "on" ? "PUBLIC" : "MEMBRES" }, file instanceof File ? file : null, f.get("removePdf") === "on");
    await audit(v.member.id, "ressource.modification", id, { title: r.title, visibility: r.visibility });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Modification impossible." };
  }
  revalidatePath("/membre/ressources");
  revalidatePath("/ressources");
  redirect(`/membre/ressources/${id}?ok=${encodeURIComponent("Ressource modifiée.")}`);
}

export async function archiveResourceAction(id: string, _p: FormState): Promise<FormState> {
  try {
    const v = await resourcePublisher();
    const r = await archiveResource(id);
    await audit(v.member.id, "ressource.retrait", id, { title: r.title });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Retrait impossible." };
  }
  revalidatePath("/membre/ressources");
  revalidatePath("/ressources");
  redirect(`/membre/ressources?ok=${encodeURIComponent("Ressource retirée (archivée).")}`);
}

// ---------------------------------------------------------------------------
// « Mon budget » (pratique personnelle : seulement les données du membre connecté)
// ---------------------------------------------------------------------------

async function budgetAction(fn: (memberId: string) => Promise<unknown>, message: string): Promise<FormState> {
  const v = await requireMember();
  try {
    await fn(v.member.id);
  } catch (e) {
    if (e instanceof PersonalBudgetError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/membre/mon-budget");
  return { ok: true, message };
}

export async function addBudgetEntryAction(_p: FormState, f: FormData): Promise<FormState> {
  const get = (k: string) => String(f.get(k) ?? "");
  return budgetAction((id) => addEntry(id, { category: get("category"), amount: get("amount"), day: get("day"), label: get("label") }), "Ligne ajoutée.");
}

export async function deleteBudgetEntryAction(entryId: string, _p: FormState): Promise<FormState> {
  return budgetAction((id) => deleteEntry(id, entryId), "Ligne supprimée.");
}

export async function setSavingGoalAction(_p: FormState, f: FormData): Promise<FormState> {
  return budgetAction((id) => setSavingGoal(id, String(f.get("goal") ?? "")), "Objectif d'épargne enregistré.");
}

// ---------------------------------------------------------------------------
// Guides de démarrage
// ---------------------------------------------------------------------------

export async function dismissOnboardingAction(kind: "MEMBRE" | "DIRIGEANT", _prev: FormState): Promise<FormState> {
  const v = await requireMember();
  await db
    .update(schema.members)
    .set(kind === "MEMBRE" ? { onboardingMemberDoneAt: new Date() } : { onboardingLeaderDoneAt: new Date() })
    .where(eq(schema.members.id, v.member.id));
  revalidatePath(kind === "MEMBRE" ? "/membre" : "/dirigeants");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mon CV
// ---------------------------------------------------------------------------

/** Le formulaire envoie le CV en JSON (lignes répétables) ; erreurs rendues par chemin, ex. « experiences.0.role ». */
export async function saveCvAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("cv") ?? "")); } catch { return { ok: false, message: "Formulaire illisible : rechargez la page." }; }
  const parsed = cvSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[i.path.join(".")] ??= i.message;
    return { ok: false, message: "Vérifiez les champs indiqués en rouge.", errors };
  }
  await saveCv(v.member.id, parsed.data);
  revalidatePath("/membre/cv");
  return { ok: true, message: "CV enregistré. Vous pouvez le télécharger en PDF." };
}

// ---------------------------------------------------------------------------
// Signaler un problème (tickets)
// ---------------------------------------------------------------------------

export async function createTicketAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const data = Object.fromEntries(["kind", "title", "description", "page"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = ticketSchema.safeParse(data);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  const file = formData.get("screenshot");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && !PHOTO_TYPES.includes(file.type)) errors.screenshot = "Format accepté : JPG, PNG ou WEBP";
  else if (hasFile && file.size > MAX_UPLOAD_BYTES) errors.screenshot = "Image trop lourde (5 Mo maximum)";
  if (!parsed.success || errors.screenshot) return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  let ref: string;
  try {
    const t = await createTicket(v.member, parsed.data, (await headers()).get("user-agent"), hasFile ? file : undefined);
    ref = ticketRef(t.number);
  } catch (e) {
    if (e instanceof TicketError) return { ok: false, message: e.message, errors: { screenshot: e.message }, data };
    throw e;
  }
  revalidatePath("/membre/signaler");
  revalidatePath("/dirigeants", "layout");
  return { ok: true, message: `Merci ! Signalement ${ref} envoyé à l'administrateur. Vous recevrez un e-mail quand il sera traité.` };
}
