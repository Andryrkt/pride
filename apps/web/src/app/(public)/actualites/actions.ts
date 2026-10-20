"use server";
import { and, db, eq, gt, schema } from "@pride/db";
import { eventRegistrationSchema, normalizePhone } from "@pride/shared";
import type { FormState } from "@/lib/utils";

/** « Je participe » : inscription d'un visiteur, sans compte, à un événement public à venir. */
export async function registerToEvent(postId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const data = { name: String(formData.get("name") ?? ""), phone: String(formData.get("phone") ?? "") };
  const parsed = eventRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  }
  const post = await db.query.posts.findFirst({
    where: and(eq(schema.posts.id, postId), eq(schema.posts.type, "EVENEMENT"), eq(schema.posts.visibility, "PUBLIC"), gt(schema.posts.eventAt, new Date())),
  });
  if (!post) return { ok: false, message: "Cet événement n'est plus ouvert aux inscriptions.", data };
  const [row] = await db
    .insert(schema.eventRegistrations)
    .values({ postId, name: parsed.data.name, phone: normalizePhone(parsed.data.phone) })
    .onConflictDoNothing()
    .returning();
  return { ok: true, message: row ? "Inscription enregistrée. À bientôt !" : "Ce numéro est déjà inscrit à cet événement." };
}
