import { getResource } from "@/lib/resources";
import { getViewerFromRequest } from "@/lib/session";
import { getFile } from "@/lib/storage";

/** PDF d'une ressource : vitrine pour tous ; « membres » pour les membres actifs. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getViewerFromRequest(req);
  const r = await getResource(id, v?.member?.status === "ACTIF");
  if (!r?.fileKey) return new Response("Introuvable ou réservé aux membres", { status: 404 });
  const body = await getFile(r.fileKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(r.fileName ?? "ressource.pdf")}"`,
      "Cache-Control": r.visibility === "PUBLIC" ? "public, max-age=300" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
