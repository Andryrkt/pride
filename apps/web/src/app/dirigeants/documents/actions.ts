"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { announceDocument, archiveDocument, DOCUMENT_TYPES, DocumentError, publishDocument, type DocumentType } from "@/lib/documents";
import { audit, canManageAssemblies, requireDirigeant } from "@/lib/session";
import type { FormState } from "@/lib/utils";

/** Documents officiels : Secrétaire générale, CA et administrateur (mêmes droits que pour les AG et les PV). */
async function guard() {
  const v = await requireDirigeant();
  if (!canManageAssemblies(v)) throw new DocumentError("Réservé à la Secrétaire générale, au conseil d'administration et à l'administrateur.");
  return v;
}

function refresh() {
  revalidatePath("/dirigeants/documents");
  revalidatePath("/association");
  revalidatePath("/membre/ag");
  revalidatePath("/actualites");
  revalidatePath("/membre/actualites");
}

export async function publishDocumentAction(_p: FormState, f: FormData): Promise<FormState> {
  const data = Object.fromEntries(["kind", "title", "description", "adoptedOn", "visibility"].map((k) => [k, String(f.get(k) ?? "").trim()]));
  const file = f.get("file");
  const errors: Record<string, string> = {};
  if (!(data.kind! in DOCUMENT_TYPES)) errors.kind = "Type de document : champ obligatoire";
  if (!data.title) errors.title = "Titre : champ obligatoire";
  const adoptedOn = data.adoptedOn ? new Date(data.adoptedOn) : null;
  if (adoptedOn && (Number.isNaN(adoptedOn.getTime()) || adoptedOn > new Date())) errors.adoptedOn = "Date d'adoption : une date passée";
  if (!(file instanceof File) || file.size === 0) errors.file = "Fichier PDF : champ obligatoire";
  if (Object.keys(errors).length) return { ok: false, message: "Vérifiez les champs indiqués.", errors, data };
  let message: string;
  try {
    const v = await guard();
    const doc = await publishDocument(
      { kind: data.kind as DocumentType, title: data.title!.slice(0, 200), description: data.description!.slice(0, 300), adoptedOn, visibility: data.visibility === "MEMBRES" ? "MEMBRES" : "PUBLIC" },
      { name: (file as File).name, content: Buffer.from(await (file as File).arrayBuffer()) },
      v.member.id,
    );
    const told = f.get("announce") ? await announceDocument(doc, v.member.id) : null;
    await audit(v.member.id, "document.publication", doc.id, { kind: doc.kind, title: doc.title, visibility: doc.visibility });
    message = `« ${doc.title} » publié ${doc.visibility === "PUBLIC" ? "sur le site public et dans l'espace membres" : "dans l'espace membres"}.${DOCUMENT_TYPES[doc.kind as DocumentType].unique ? " L'ancienne version, s'il y en avait une, est aux archives." : ""}${told !== null ? ` Actualité publiée, e-mail envoyé à ${told} membre(s).` : ""}`;
  } catch (e) {
    if (e instanceof DocumentError) return { ok: false, message: e.message, data };
    throw e;
  }
  refresh();
  redirect(`/dirigeants/documents?ok=${encodeURIComponent(message)}`);
}

export async function archiveDocumentAction(id: string): Promise<FormState> {
  try {
    const v = await guard();
    const doc = await archiveDocument(id);
    await audit(v.member.id, "document.archive", id, { kind: doc.kind, title: doc.title });
  } catch (e) {
    if (e instanceof DocumentError) return { ok: false, message: e.message };
    throw e;
  }
  refresh();
  return { ok: true, message: "Document retiré : il est aux archives." };
}
