import { db, eq, schema } from "@pride/db";
import { getViewerFromRequest } from "@/lib/session";
import { getFile } from "@/lib/storage";

/** Pièce jointe d'un message : le membre de la conversation et les dirigeants. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await getViewerFromRequest(req);
  if (!v?.member) return new Response("Accès refusé", { status: 403 });
  const { id } = await params;
  const m = await db.query.messages.findFirst({ where: eq(schema.messages.id, id), with: { conversation: true } });
  if (!m?.attachmentKey) return new Response("Introuvable", { status: 404 });
  if (!v.isDirigeant && m.conversation.memberId !== v.member.id) return new Response("Accès refusé", { status: 403 });
  const body = await getFile(m.attachmentKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": m.attachmentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(m.attachmentName ?? "piece")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
