import "server-only";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Stockage des fichiers (pièces de candidature…).
 * - S3_ENDPOINT défini : MinIO en local, ou tout service compatible S3 en production.
 * - sinon : dossier ./uploads sur le disque (pratique pour un premier essai).
 */
const useS3 = Boolean(process.env.S3_ENDPOINT);
const bucket = process.env.S3_BUCKET ?? "pride";
const localDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads");

const s3 = useS3
  ? new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? "", secretAccessKey: process.env.S3_SECRET_KEY ?? "" },
    })
  : null;

function safeKey(key: string) {
  if (key.includes("..") || key.startsWith("/")) throw new Error("Clé de fichier invalide");
  return key;
}

export async function putFile(key: string, body: Buffer, contentType: string) {
  safeKey(key);
  if (s3) {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const file = path.join(localDir, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

export async function getFile(key: string): Promise<Buffer> {
  safeKey(key);
  if (s3) {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  return readFile(path.join(localDir, key));
}
