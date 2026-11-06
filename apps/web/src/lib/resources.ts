import "server-only";
import { and, db, desc, eq, isNull, schema } from "@pride/db";
import { RESOURCE_THEMES, youtubeId, type ResourceTheme } from "@pride/shared";
import { pdfProblem } from "./documents";
import type { Viewer } from "./session";
import { putFile } from "./storage";

export class ResourceError extends Error {}

/** Publient les ressources : responsables de la Commission formation et projets, Secrétaire générale, administrateur. */
export async function canPublishResources(v: NonNullable<Viewer>) {
  if (v.isAdmin || v.roles.includes("SECRETAIRE_GENERALE")) return true;
  if (!v.commissionIds.length) return false;
  const c = await db.query.commissions.findFirst({ where: eq(schema.commissions.slug, "formation-projets") });
  return !!c && v.commissionIds.includes(c.id);
}

/** Ressources en ligne, les plus récentes d'abord ; `membersToo` : avec celles réservées aux membres. */
export function listResources(membersToo: boolean, theme?: ResourceTheme) {
  return db.query.resources.findMany({
    where: and(isNull(schema.resources.archivedAt), membersToo ? undefined : eq(schema.resources.visibility, "PUBLIC"), theme ? eq(schema.resources.theme, theme) : undefined),
    orderBy: desc(schema.resources.publishedAt),
    with: { author: true },
  });
}

/** Une ressource en ligne, si le visiteur peut la voir. */
export async function getResource(id: string, membersToo: boolean) {
  const r = await db.query.resources.findFirst({ where: and(eq(schema.resources.id, id), isNull(schema.resources.archivedAt)), with: { author: true } });
  return r && (membersToo || r.visibility === "PUBLIC") ? r : null;
}

export type ResourceInput = { theme: string; title: string; summary: string; body: string; videoUrl: string; visibility: string };

/** Champs vérifiés d'une ressource (publication ou modification). */
function clean(input: ResourceInput) {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const body = input.body.trim();
  const videoUrl = input.videoUrl.trim();
  if (!(input.theme in RESOURCE_THEMES)) throw new ResourceError("Choisissez un thème.");
  if (title.length < 3 || title.length > 150) throw new ResourceError("Le titre doit faire entre 3 et 150 caractères.");
  if (!summary || summary.length > 300) throw new ResourceError("Le résumé est obligatoire (300 caractères au maximum).");
  if (!body) throw new ResourceError("Le texte de la ressource est obligatoire.");
  if (videoUrl && !youtubeId(videoUrl)) throw new ResourceError("Lien vidéo non reconnu : collez un lien YouTube (youtube.com ou youtu.be).");
  if (input.visibility !== "PUBLIC" && input.visibility !== "MEMBRES") throw new ResourceError("Visibilité invalide.");
  return { theme: input.theme, title, summary, body, videoUrl: videoUrl || null, visibility: input.visibility as "PUBLIC" | "MEMBRES" };
}

/** Enregistre le PDF envoyé (vérifié), ou null s'il n'y en a pas. */
async function savePdf(file: File | null) {
  if (!file || file.size === 0) return null;
  const content = Buffer.from(await file.arrayBuffer());
  const problem = pdfProblem(content);
  if (problem) throw new ResourceError(problem);
  const fileKey = `ressources/${crypto.randomUUID()}.pdf`;
  await putFile(fileKey, content, "application/pdf");
  return { fileKey, fileName: file.name || "ressource.pdf" };
}

export async function publishResource(input: ResourceInput, file: File | null, authorId: string) {
  const data = clean(input);
  const pdf = await savePdf(file);
  const [row] = await db.insert(schema.resources).values({ ...data, ...pdf, authorId }).returning();
  return row!;
}

/** Modification : tous les champs ; le PDF est remplacé si un nouveau est envoyé, ou retiré si demandé (l'ancien fichier est gardé). */
export async function updateResource(id: string, input: ResourceInput, file: File | null, removePdf: boolean) {
  const data = clean(input);
  const pdf = (await savePdf(file)) ?? (removePdf ? { fileKey: null, fileName: null } : {});
  const [row] = await db.update(schema.resources).set({ ...data, ...pdf }).where(and(eq(schema.resources.id, id), isNull(schema.resources.archivedAt))).returning();
  if (!row) throw new ResourceError("Ressource introuvable ou retirée.");
  return row;
}

/** « Retirer » : la ressource passe aux archives (jamais supprimée). */
export async function archiveResource(id: string) {
  const [row] = await db.update(schema.resources).set({ archivedAt: new Date() }).where(and(eq(schema.resources.id, id), isNull(schema.resources.archivedAt))).returning();
  if (!row) throw new ResourceError("Ressource introuvable ou déjà retirée.");
  return row;
}
