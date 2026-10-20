"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, db, eq, schema } from "@pride/db";
import { paymentRequestSchema, profileSchema } from "@pride/shared";
import { PaymentError, payDues } from "@/lib/dues";
import { requireMember } from "@/lib/session";
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
