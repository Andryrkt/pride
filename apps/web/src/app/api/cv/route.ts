import { cvPdf, getCv } from "@/lib/cv";
import { getViewerFromRequest } from "@/lib/session";

/** « Télécharger mon CV » (PDF) du membre connecté ; `?apercu=1` : affiché sans téléchargement. */
export async function GET(req: Request) {
  const v = await getViewerFromRequest(req);
  if (!v?.member) return new Response("Connectez-vous pour télécharger votre CV.", { status: 401 });
  const cv = await getCv(v.member.id);
  if (!cv) return new Response("Remplissez d'abord votre CV dans « Mon CV ».", { status: 409 });
  const body = await cvPdf(v.member, cv);
  const name = `CV-${v.member.lastName}-${v.member.firstNames.split(" ")[0]}`.normalize("NFD").replace(/[^\w-]/g, "");
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.get("apercu") ? "inline" : "attachment"}; filename="${name}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
