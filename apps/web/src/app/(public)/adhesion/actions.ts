"use server";
import { applicationSchema, isMinor, type DocumentKind } from "@pride/shared";
import { createApplication, requiredDocuments, validateFile, type UploadedDoc } from "@/lib/applications";
import type { FormState } from "@/lib/utils";

const FIELD_NAMES = ["lastName", "firstNames", "birthDate", "phone", "email", "address", "profession", "skills", "expectations", "category", "sponsorship", "sponsorMemberId", "parentName", "parentMemberNumber"];

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw: Record<string, unknown> = {};
  for (const k of FIELD_NAMES) {
    const v = formData.get(k);
    if (typeof v === "string" && v.trim() !== "") raw[k] = v;
  }
  raw.consent = formData.get("consent") === "on";
  const data = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string")) as Record<string, string>;

  const errors: Record<string, string> = {};
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
  }

  const birth = typeof raw.birthDate === "string" ? new Date(raw.birthDate) : null;
  const minor = birth && !Number.isNaN(birth.getTime()) ? isMinor(birth) : false;
  const docs: UploadedDoc[] = [];
  for (const kind of requiredDocuments(minor)) {
    const file = formData.get(`doc_${kind}`) as File | null;
    const problem = validateFile(file);
    if (problem) errors[`doc_${kind}`] = problem;
    else docs.push({ kind: kind as DocumentKind, file: file! });
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false, message: "Certains champs sont à compléter ou à corriger.", errors, data };
  }

  try {
    const app = await createApplication(parsed.data, docs);
    return { ok: true, message: app.reference, data: { email: app.email ?? "" } };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "L'envoi a échoué. Merci de réessayer dans quelques minutes.", data };
  }
}
