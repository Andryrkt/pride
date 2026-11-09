import { cardPdf, cardPng } from "@/lib/card";
import { getViewerFromRequest } from "@/lib/session";

/**
 * « Télécharger ma carte » du membre connecté (web et application mobile) : PDF à imprimer,
 * ou image PNG avec `?format=png` (à garder sur son téléphone ou partager). `?apercu=1` : affichée sans téléchargement.
 */
export async function GET(req: Request) {
  const v = await getViewerFromRequest(req);
  if (!v?.member) return new Response("Connectez-vous pour télécharger votre carte.", { status: 401 });
  if (v.member.status !== "ACTIF") return new Response("Carte disponible uniquement pour un membre actif.", { status: 403 });
  const { member } = v;
  if (!member.photoKey) return new Response("Ajoutez d'abord votre photo dans « Mon profil ».", { status: 409 });
  const params = new URL(req.url).searchParams;
  const png = params.get("format") === "png";
  const body = png ? await cardPng({ ...member, photoKey: member.photoKey }) : await cardPdf({ ...member, photoKey: member.photoKey });
  const name = `carte-pride-${member.number}.${png ? "png" : "pdf"}`;
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": png ? "image/png" : "application/pdf",
      "Content-Disposition": `${params.get("apercu") ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
