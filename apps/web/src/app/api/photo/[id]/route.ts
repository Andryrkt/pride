import { db, eq, schema } from "@pride/db";
import { memberPhoto } from "@/lib/photo";

/**
 * Photo d'un membre actif, par son identifiant interne (aléatoire, impossible à deviner) : elle accompagne la page de
 * vérification ouverte par le QR de la carte, et le tableau de bord du membre.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await db.query.members.findFirst({ where: eq(schema.members.id, id) });
  if (!m?.photoKey || m.status !== "ACTIF") return new Response("Introuvable", { status: 404 });
  const body = await memberPhoto(m.photoKey);
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
