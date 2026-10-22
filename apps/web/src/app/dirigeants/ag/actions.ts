"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAJORITES, type Majorite } from "@pride/shared";
import {
  addResolution,
  AssemblyError,
  closeSession,
  convoke,
  createAssembly,
  declareCarence,
  openSession,
  recordVote,
  removeAttendance,
  removeResolution,
  secondConvocation,
  signAttendance,
  updateAssembly,
  type AssemblyInput,
} from "@/lib/assemblies";
import { createConsultation } from "@/lib/consultations";
import { audit, canManageAssemblies, requireDirigeant } from "@/lib/session";
import type { FormState } from "@/lib/utils";

async function guard() {
  const v = await requireDirigeant();
  if (!canManageAssemblies(v)) throw new AssemblyError("Action réservée au conseil d'administration et au Secrétariat général.");
  return v;
}

function fail(e: unknown): FormState {
  return { ok: false, message: e instanceof Error ? e.message : "Action impossible." };
}

const invalid = (errors: Record<string, string>): FormState => ({ ok: false, message: "Vérifiez les champs indiqués.", errors });

function done(id: string, message: string): never {
  revalidatePath("/dirigeants/ag");
  revalidatePath(`/dirigeants/ag/${id}`);
  revalidatePath("/membre/ag");
  redirect(`/dirigeants/ag/${id}?ok=${encodeURIComponent(message)}`);
}

function parseAssembly(f: FormData): { data?: AssemblyInput; errors: Record<string, string> } {
  const title = String(f.get("title") ?? "").trim();
  const location = String(f.get("location") ?? "").trim();
  const agenda = String(f.get("agenda") ?? "").trim();
  const scheduledAt = new Date(String(f.get("scheduledAt") ?? ""));
  const kind = f.get("kind") === "EXTRAORDINAIRE" ? "EXTRAORDINAIRE" : "ORDINAIRE";
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Intitulé : champ obligatoire";
  if (Number.isNaN(scheduledAt.getTime())) errors.scheduledAt = "Date et heure : champ obligatoire";
  if (!location) errors.location = "Lieu : champ obligatoire";
  if (!agenda) errors.agenda = "Ordre du jour : champ obligatoire";
  return Object.keys(errors).length ? { errors } : { data: { kind, title, scheduledAt, location, agenda }, errors };
}

const count = (f: FormData, k: string) => {
  const raw = String(f.get(k) ?? "").trim();
  return raw === "" ? NaN : Number(raw);
};

export async function createAssemblyAction(_p: FormState, f: FormData): Promise<FormState> {
  const { data, errors } = parseAssembly(f);
  if (!data) return invalid(errors);
  let id = "";
  try {
    const v = await guard();
    const a = await createAssembly(data, v.member.id);
    id = a.id;
    await audit(v.member.id, "ag.creation", a.id, { reference: a.reference });
  } catch (e) { return fail(e); }
  done(id, "AG créée. Ajoutez les résolutions, puis envoyez la convocation.");
}

export async function updateAssemblyAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  const { data, errors } = parseAssembly(f);
  if (!data) return invalid(errors);
  try {
    const v = await guard();
    await updateAssembly(id, data);
    await audit(v.member.id, "ag.modification", id);
  } catch (e) { return fail(e); }
  done(id, "AG mise à jour.");
}

export async function addResolutionAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  const title = String(f.get("title") ?? "").trim();
  const text = String(f.get("text") ?? "").trim();
  const majority = String(f.get("majority") ?? "SIMPLE") as Majorite;
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Intitulé : champ obligatoire";
  if (!text) errors.text = "Texte : champ obligatoire";
  if (!(majority in MAJORITES)) errors.majority = "Majorité : champ obligatoire";
  if (Object.keys(errors).length) return invalid(errors);
  try {
    const v = await guard();
    await addResolution(id, { title, text, majority });
    await audit(v.member.id, "ag.resolution_ajout", id, { title, majority });
  } catch (e) { return fail(e); }
  done(id, "Résolution ajoutée.");
}

export async function removeResolutionAction(resolutionId: string, id: string, _p: FormState): Promise<FormState> {
  try {
    const v = await guard();
    const r = await removeResolution(resolutionId);
    await audit(v.member.id, "ag.resolution_retrait", id, { title: r.title });
  } catch (e) { return fail(e); }
  done(id, "Résolution retirée.");
}

export async function convokeAction(id: string, _p: FormState): Promise<FormState> {
  let message = "";
  try {
    const v = await guard();
    const r = await convoke(id, v.member.id);
    await audit(v.member.id, "ag.convocation", id, r);
    message = `Convocation envoyée par e-mail à ${r.sent} membre(s) sur ${r.members}, et publiée dans l'espace membres.`;
    if (r.recipients < r.members) message += ` ${r.members - r.recipients} membre(s) sans e-mail : prévenez-les par téléphone ou SMS.`;
    if (r.delay.late) message += ` Attention : la réunion a lieu dans ${r.delay.days} jour(s), moins que les 15 jours prévus.`;
  } catch (e) { return fail(e); }
  done(id, message);
}

export async function openSessionAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  const presidentId = String(f.get("presidentId") ?? "");
  const secretaryId = String(f.get("secretaryId") ?? "");
  const errors: Record<string, string> = {};
  if (!presidentId) errors.presidentId = "Président de séance : champ obligatoire";
  if (!secretaryId) errors.secretaryId = "Secrétaire de séance : champ obligatoire";
  if (Object.keys(errors).length) return invalid(errors);
  let message = "";
  try {
    const v = await guard();
    const r = await openSession(id, presidentId, secretaryId);
    await audit(v.member.id, "ag.ouverture", id, { ...r, presidentId, secretaryId });
    message = `Séance ouverte : ${r.eligible} membre(s) ont le droit de vote, quorum de ${r.quorum}. Faites émarger les présents.`;
  } catch (e) { return fail(e); }
  done(id, message);
}

export async function signAttendanceAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  const memberId = String(f.get("memberId") ?? "");
  if (!memberId) return invalid({ memberId: "Membre : champ obligatoire" });
  let message = "";
  try {
    const v = await guard();
    const row = await signAttendance(id, memberId);
    await audit(v.member.id, "ag.emargement", id, { memberId, canVote: row.canVote });
    message = row.canVote ? "Présence enregistrée." : "Présence enregistrée (sans droit de vote).";
  } catch (e) { return fail(e); }
  done(id, message);
}

export async function removeAttendanceAction(id: string, memberId: string, _p: FormState): Promise<FormState> {
  try {
    const v = await guard();
    await removeAttendance(id, memberId);
    await audit(v.member.id, "ag.emargement_retrait", id, { memberId });
  } catch (e) { return fail(e); }
  done(id, "Présence retirée.");
}

export async function voteAction(resolutionId: string, id: string, _p: FormState, f: FormData): Promise<FormState> {
  const vote = { pour: count(f, "pour"), contre: count(f, "contre"), abstention: count(f, "abstention") };
  const errors: Record<string, string> = {};
  if (Number.isNaN(vote.pour)) errors.pour = "Pour : champ obligatoire";
  if (Number.isNaN(vote.contre)) errors.contre = "Contre : champ obligatoire";
  if (Number.isNaN(vote.abstention)) errors.abstention = "Abstentions : champ obligatoire";
  if (Object.keys(errors).length) return invalid(errors);
  let message = "";
  try {
    const v = await guard();
    const r = await recordVote(resolutionId, vote);
    await audit(v.member.id, "ag.vote", id, { resolutionId, ...vote, voters: r.voters, adopted: r.adopted });
    message = `Résolution ${r.resolution.position} ${r.adopted ? "adoptée" : "rejetée"}.`;
  } catch (e) { return fail(e); }
  done(id, message);
}

export async function carenceAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  try {
    const v = await guard();
    await declareCarence(id, String(f.get("notes") ?? "").trim());
    await audit(v.member.id, "ag.carence", id);
  } catch (e) { return fail(e); }
  done(id, "Carence constatée : le procès-verbal de carence est établi. Convoquez la deuxième AG.");
}

export async function secondConvocationAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  const scheduledAt = new Date(String(f.get("scheduledAt") ?? ""));
  if (Number.isNaN(scheduledAt.getTime())) return invalid({ scheduledAt: "Date et heure : champ obligatoire" });
  let nextId = "";
  try {
    const v = await guard();
    const next = await secondConvocation(id, scheduledAt, v.member.id);
    nextId = next.id;
    await audit(v.member.id, "ag.deuxieme_convocation", next.id, { previousId: id, reference: next.reference });
  } catch (e) { return fail(e); }
  revalidatePath(`/dirigeants/ag/${id}`);
  done(nextId, "Deuxième AG créée avec le même ordre du jour : vérifiez-la puis envoyez la convocation.");
}

export async function closeSessionAction(id: string, _p: FormState, f: FormData): Promise<FormState> {
  try {
    const v = await guard();
    await closeSession(id, String(f.get("notes") ?? "").trim());
    await audit(v.member.id, "ag.cloture", id);
  } catch (e) { return fail(e); }
  done(id, "Séance clôturée : le procès-verbal est définitif.");
}

/** Consultation en ligne : 2 à 6 réponses (une par ligne), date de clôture dans le futur. */
export async function createConsultationAction(_p: FormState, f: FormData): Promise<FormState> {
  const question = String(f.get("question") ?? "").trim();
  const options = [...new Set(String(f.get("options") ?? "").split(/\r?\n/).map((o) => o.trim()).filter(Boolean))];
  const closesAt = new Date(String(f.get("closesAt") ?? ""));
  const errors: Record<string, string> = {};
  if (!question) errors.question = "Question : champ obligatoire";
  if (options.length < 2 || options.length > 6) errors.options = "Réponses : de 2 à 6, une par ligne";
  if (Number.isNaN(closesAt.getTime()) || closesAt <= new Date()) errors.closesAt = "Clôture : une date dans le futur";
  const data = { question, options: String(f.get("options") ?? ""), closesAt: String(f.get("closesAt") ?? "") };
  if (Object.keys(errors).length) return { ...invalid(errors), data };
  try {
    const v = await guard();
    const c = await createConsultation({ question: question.slice(0, 200), options: options.map((o) => o.slice(0, 120)), closesAt }, v.member.id);
    await audit(v.member.id, "consultation.creation", c.id, { question, options, closesAt });
  } catch (e) { return fail(e); }
  revalidatePath("/dirigeants/ag");
  revalidatePath("/membre", "layout");
  return { ok: true, message: "Consultation ouverte : les membres peuvent voter dans leur espace." };
}
