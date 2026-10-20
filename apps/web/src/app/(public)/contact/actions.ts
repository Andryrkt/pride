"use server";
import { db, schema } from "@pride/db";
import { contactSchema } from "@pride/shared";
import { validateFile } from "@/lib/applications";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import type { FormState } from "@/lib/utils";

export async function sendContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const data = { name: raw.name, email: raw.email, phone: raw.phone ?? "", subject: raw.subject, message: raw.message };
  const parsed = contactSchema.safeParse(raw);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;

  const files = (formData.getAll("attachments") as File[]).filter((f) => f && f.size > 0);
  if (files.length > 3) errors.attachments = "3 pièces jointes maximum";
  for (const f of files) {
    const p = validateFile(f);
    if (p) errors.attachments = `${f.name} : ${p}`;
  }
  if (!parsed.success || Object.keys(errors).length) return { ok: false, message: "Merci de compléter les champs indiqués.", errors, data };

  const m = parsed.data;
  await db.insert(schema.contactMessages).values({ name: m.name, email: m.email, phone: m.phone, subject: m.subject, message: m.message });
  const attachments = await Promise.all(files.map(async (f) => ({ filename: f.name, content: Buffer.from(await f.arrayBuffer()), contentType: f.type })));
  try {
    await sendMail({
      to: env.mailAssociation,
      replyTo: m.email,
      subject: `[Site PRIDe] ${m.subject}`,
      text: `Message envoyé depuis le formulaire de contact du site.\n\nDe : ${m.name} <${m.email}>${m.phone ? `\nTéléphone : ${m.phone}` : ""}\n\n${m.message}`,
      attachments,
    });
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Le message est enregistré mais l'e-mail n'a pas pu partir. Nous le traiterons quand même.", data };
  }
  return { ok: true, message: m.subject, data: { attachments: String(files.length) } };
}
