"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, db, eq, schema } from "@pride/db";
import { MAX_UPLOAD_BYTES, paymentRequestSchema, profileSchema, solidarityRequestSchema } from "@pride/shared";
import { PaymentError, payDues } from "@/lib/dues";
import { requireMember } from "@/lib/session";
import { validateFile } from "@/lib/applications";
import { declareSolidarity, SolidarityError } from "@/lib/solidarity";
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

export async function toggleRegistration(postId: string) {
  const v = await requireMember();
  const existing = await db.query.eventRegistrations.findFirst({
    where: and(eq(schema.eventRegistrations.postId, postId), eq(schema.eventRegistrations.memberId, v.member.id)),
  });
  if (existing) await db.delete(schema.eventRegistrations).where(eq(schema.eventRegistrations.id, existing.id));
  else await db.insert(schema.eventRegistrations).values({ postId, memberId: v.member.id });
  revalidatePath("/membre/actualites");
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
