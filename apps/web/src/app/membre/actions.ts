"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, db, eq, schema } from "@pride/db";
import { MAX_UPLOAD_BYTES, offerSchema, paymentRequestSchema, profileSchema, proposalSchema, solidarityRequestSchema } from "@pride/shared";
import { PaymentError, payDues } from "@/lib/dues";
import { requireMember } from "@/lib/session";
import { validateFile } from "@/lib/applications";
import { declareSolidarity, SolidarityError } from "@/lib/solidarity";
import { askHelp, closeOffer, expressInterest, NetworkError, proposeOffer, requestCommission, sendProposal } from "@/lib/network";
import { PhotoError, setMemberPhoto } from "@/lib/photo";
import type { FormState } from "@/lib/utils";

export async function payAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const v = await requireMember();
  const dueIds = formData.getAll("due").map(String);
  const parsed = paymentRequestSchema.safeParse({ dueIds, provider: formData.get("provider"), phone: formData.get("phone") });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: Object.values(errors)[0], errors };
  }
  let receipt: string | null | undefined;
  try {
    const p = await payDues({ memberId: v.member.id, dueIds: parsed.data.dueIds, provider: parsed.data.provider, phone: parsed.data.phone });
    receipt = p?.status === "REUSSI" ? p.receiptNumber : null;
  } catch (e) {
    return { ok: false, message: e instanceof PaymentError || e instanceof Error ? e.message : "Paiement impossible." };
  }
  revalidatePath("/membre");
  redirect(receipt ? `/membre/cotisations?recu=${encodeURIComponent(receipt)}` : "/membre/cotisations?attente=1");
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
    [],
  );
}
