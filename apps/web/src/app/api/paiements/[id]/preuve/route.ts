import { db, eq, schema } from "@pride/db";
import { canRecordFinances, getViewerFromRequest } from "@/lib/session";
import { getFile } from "@/lib/storage";

/** Capture jointe à un paiement déclaré : ceux qui le vérifient, et le membre lui-même. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await getViewerFromRequest(req);
  if (!v?.member) return new Response("Accès refusé", { status: 403 });
  const { id } = await params;
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, id) });
  if (!p?.proofKey) return new Response("Introuvable", { status: 404 });
  if (!canRecordFinances(v) && p.memberId !== v.member.id) return new Response("Accès refusé", { status: 403 });
  const body = await getFile(p.proofKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": p.proofType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(p.proofName ?? "capture")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
