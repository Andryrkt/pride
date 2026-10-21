import { db, eq, schema } from "@pride/db";
import { canHandleSolidarity, getViewerFromRequest } from "@/lib/session";
import { getFile } from "@/lib/storage";

/** Pièce jointe d'une demande d'aide de solidarité : dirigeants qui traitent les demandes, et le membre lui-même. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await getViewerFromRequest(req);
  if (!v?.member) return new Response("Accès refusé", { status: 403 });
  const { id } = await params;
  const r = await db.query.solidarityRequests.findFirst({ where: eq(schema.solidarityRequests.id, id) });
  if (!r?.attachmentKey) return new Response("Introuvable", { status: 404 });
  if (!canHandleSolidarity(v) && r.memberId !== v.member.id) return new Response("Accès refusé", { status: 403 });
  const body = await getFile(r.attachmentKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": r.attachmentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(r.attachmentName ?? "piece")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
