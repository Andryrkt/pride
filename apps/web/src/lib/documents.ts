import "server-only";
import { and, asc, db, desc, eq, inArray, isNotNull, isNull, schema } from "@pride/db";
import { env } from "./env";
import { sendMail } from "./mail";
import { putFile } from "./storage";
import { slugify } from "./utils";

export class DocumentError extends Error {}

/** Types de documents ; `unique` : une seule version en vigueur, la précédente est archivée à la publication. */
export const DOCUMENT_TYPES = {
  STATUTS: { label: "Statuts", unique: true },
  REGLEMENT: { label: "Règlement intérieur", unique: true },
  PRESENTATION: { label: "Document de présentation", unique: true },
  PV: { label: "Procès-verbal", unique: false },
  RAPPORT: { label: "Rapport d'activité ou financier", unique: false },
  AUTRE: { label: "Autre document", unique: false },
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;

const MAX_BYTES = 10 * 1024 * 1024;

/** Documents en vigueur, statuts et règlement d'abord ; `membersToo` : avec ceux réservés aux membres. */
export async function currentDocuments(membersToo: boolean) {
  const rows = await db.query.officialDocuments.findMany({
    where: and(isNull(schema.officialDocuments.archivedAt), membersToo ? undefined : eq(schema.officialDocuments.visibility, "PUBLIC")),
    orderBy: [desc(schema.officialDocuments.adoptedOn), desc(schema.officialDocuments.publishedAt)],
  });
  const order = Object.keys(DOCUMENT_TYPES);
  return rows.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export const archivedDocuments = () =>
  db.query.officialDocuments.findMany({ where: isNotNull(schema.officialDocuments.archivedAt), orderBy: [asc(schema.officialDocuments.kind), desc(schema.officialDocuments.archivedAt)] });

/** Publication d'un PDF ; pour les statuts, le règlement et la présentation, la version précédente passe aux archives. */
/** `file` : PDF envoyé par un dirigeant, ou généré par l'application (procès-verbal d'AG). */
export async function publishDocument(input: { kind: DocumentType; title: string; description: string; adoptedOn: Date | null; visibility: "PUBLIC" | "MEMBRES" }, file: { name: string; content: Buffer }, actorId: string) {
  const { content } = file;
  if (content.length === 0) throw new DocumentError("Fichier manquant.");
  if (content.length > MAX_BYTES) throw new DocumentError("Fichier trop lourd (10 Mo maximum).");
  // On vérifie le contenu, pas seulement le type annoncé par le navigateur.
  if (content.subarray(0, 5).toString("latin1") !== "%PDF-") throw new DocumentError("Le document doit être un fichier PDF.");
  const key = `documents/${input.kind.toLowerCase()}-${crypto.randomUUID()}.pdf`;
  await putFile(key, content, "application/pdf");
  return db.transaction(async (tx) => {
    if (DOCUMENT_TYPES[input.kind].unique) {
      await tx.update(schema.officialDocuments).set({ archivedAt: new Date() }).where(and(eq(schema.officialDocuments.kind, input.kind), isNull(schema.officialDocuments.archivedAt)));
    }
    const [row] = await tx
      .insert(schema.officialDocuments)
      .values({ ...input, description: input.description || null, storageKey: key, filename: file.name || `${input.kind.toLowerCase()}.pdf`, size: content.length, publishedBy: actorId })
      .returning();
    return row!;
  });
}

/** Retrait d'un document en vigueur : il passe aux archives (jamais supprimé). */
export async function archiveDocument(id: string) {
  const [row] = await db.update(schema.officialDocuments).set({ archivedAt: new Date() }).where(and(eq(schema.officialDocuments.id, id), isNull(schema.officialDocuments.archivedAt))).returning();
  if (!row) throw new DocumentError("Ce document est déjà aux archives.");
  return row;
}

/** Types « uniques » sans version en vigueur (pour le tableau de bord de la Secrétaire générale). */
export async function missingDocuments() {
  const kinds = (Object.keys(DOCUMENT_TYPES) as DocumentType[]).filter((k) => k !== "PRESENTATION" && DOCUMENT_TYPES[k].unique);
  const present = await db.query.officialDocuments.findMany({ where: and(inArray(schema.officialDocuments.kind, kinds), isNull(schema.officialDocuments.archivedAt)) });
  return kinds.filter((k) => !present.some((d) => d.kind === k));
}

/**
 * Annonce d'un document publié : une actualité (même visibilité que le document) et un e-mail aux membres actifs,
 * en copie cachée. L'e-mail ne bloque jamais la publication.
 */
export async function announceDocument(doc: typeof schema.officialDocuments.$inferSelect, actorId: string) {
  const url = `${env.appUrl}/api/documents/${doc.id}`;
  const kind = DOCUMENT_TYPES[doc.kind as DocumentType]?.label ?? "Document";
  const intro = `${kind} publié par l'association : « ${doc.title} »${doc.description ? ` (${doc.description})` : ""}.`;
  const reserved = doc.visibility === "MEMBRES" ? "\n\nDocument réservé aux membres : connectez-vous à votre espace pour l'ouvrir." : "";
  const body = `${intro}\n\nLe consulter (PDF) : ${url}${reserved}`;
  await db.insert(schema.posts).values({
    slug: `${slugify(doc.title)}-${Date.now().toString(36)}`,
    // La page publique des actualités n'affiche que les articles (et les événements à venir).
    type: doc.visibility === "PUBLIC" ? "ARTICLE" : "ANNONCE",
    title: `Nouveau document : ${doc.title}`,
    excerpt: intro.slice(0, 240),
    body,
    visibility: doc.visibility,
    authorId: actorId,
  });
  const members = await db.query.members.findMany({ where: and(eq(schema.members.status, "ACTIF"), isNotNull(schema.members.email)), columns: { email: true } });
  const bcc = members.map((m) => m.email!);
  if (bcc.length) {
    await sendMail({ to: env.mailAssociation, bcc, subject: `PRIDe : nouveau document, ${doc.title}`, text: `Bonjour,\n\n${body}\n\nL'équipe PRIDe` }).catch((e) => console.error("Annonce du document : e-mail non envoyé", e));
  }
  return bcc.length;
}
