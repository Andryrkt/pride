import { db, eq, schema } from "@pride/db";
import { getViewerFromRequest } from "@/lib/session";
import { getFile } from "@/lib/storage";

/** Capture d'écran d'un ticket : l'administrateur et l'auteur du ticket. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await getViewerFromRequest(req);
  if (!v?.member) return new Response("Accès refusé", { status: 403 });
  const t = await db.query.tickets.findFirst({ where: eq(schema.tickets.id, (await params).id) });
  if (!t?.screenshotKey) return new Response("Introuvable", { status: 404 });
  if (!v.isAdmin && t.memberId !== v.member.id) return new Response("Accès refusé", { status: 403 });
  return new Response(new Uint8Array(await getFile(t.screenshotKey)), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
