import { cardPdf } from "@/lib/card";
import { getViewerFromRequest } from "@/lib/session";

/** « Télécharger ma carte » : la carte PDF du membre connecté (web et application mobile). */
export async function GET(req: Request) {
  const v = await getViewerFromRequest(req);
  if (!v?.member) return new Response("Connectez-vous pour télécharger votre carte.", { status: 401 });
  if (v.member.status !== "ACTIF") return new Response("Carte disponible uniquement pour un membre actif.", { status: 403 });
  const { member } = v;
  if (!member.photoKey) return new Response("Ajoutez d'abord votre photo dans « Mon profil ».", { status: 409 });
  const pdf = await cardPdf({ ...member, photoKey: member.photoKey });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="carte-pride-${member.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
