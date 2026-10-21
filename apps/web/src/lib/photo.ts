import "server-only";
import sharp from "sharp";
import { db, eq, schema } from "@pride/db";
import { getFile, putFile } from "./storage";

export class PhotoError extends Error {}

/**
 * Photo d'identité : redressée selon l'orientation du téléphone, recadrée en 3:4 sur le visage (zone la plus « intéressante »),
 * réduite à 600 × 800 et réencodée en JPEG. Le réencodage supprime les métadonnées (position GPS, appareil…).
 */
export async function normalizePhoto(input: Buffer) {
  try {
    return await sharp(input).rotate().resize(600, 800, { fit: "cover", position: sharp.strategy.attention }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new PhotoError("Image illisible : envoyez une photo JPG, PNG ou WEBP.");
  }
}

export async function setMemberPhoto(memberId: string, file: File) {
  const jpeg = await normalizePhoto(Buffer.from(await file.arrayBuffer()));
  // Nouvelle clé à chaque changement : l'ancienne photo n'est plus servie (pas de cache périmé).
  const key = `photos/${memberId}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  await putFile(key, jpeg, "image/jpeg");
  await db.update(schema.members).set({ photoKey: key }).where(eq(schema.members.id, memberId));
}

export const memberPhoto = (photoKey: string) => getFile(photoKey);
