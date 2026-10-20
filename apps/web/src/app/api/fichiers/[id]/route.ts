import { db, eq, schema } from "@pride/db";
import { getViewerFromRequest } from "@/lib/session";
import { getFile } from "@/lib/storage";

/** Pièces de candidature : visibles uniquement par les dirigeants. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await getViewerFromRequest(req);
  if (!v?.isDirigeant) return new Response("Accès refusé", { status: 403 });
  const { id } = await params;
  const doc = await db.query.applicationDocuments.findFirst({ where: eq(schema.applicationDocuments.id, id) });
  if (!doc) return new Response("Introuvable", { status: 404 });
  const body = await getFile(doc.storageKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
