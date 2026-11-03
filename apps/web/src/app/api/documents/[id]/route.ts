import { db, eq, schema } from "@pride/db";
import { getViewerFromRequest } from "@/lib/session";
import { getFile } from "@/lib/storage";

/** Document officiel : public pour tous ; « membres » pour les membres actifs et les dirigeants. Les archives restent consultables. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await db.query.officialDocuments.findFirst({ where: eq(schema.officialDocuments.id, id) });
  if (!doc) return new Response("Introuvable", { status: 404 });
  if (doc.visibility === "MEMBRES") {
    const v = await getViewerFromRequest(req);
    if (v?.member?.status !== "ACTIF") return new Response("Document réservé aux membres", { status: 403 });
  }
  const body = await getFile(doc.storageKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      "Cache-Control": doc.visibility === "PUBLIC" ? "public, max-age=300" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
