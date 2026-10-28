import { journalCsv } from "@/lib/finances";
import { getViewerFromRequest } from "@/lib/session";

/** Export du journal comptable d'une année (CSV pour Excel), pour l'AG : dirigeants et comptable. */
export async function GET(req: Request) {
  const v = await getViewerFromRequest(req);
  if (!v?.member || v.member.status !== "ACTIF" || (!v.isDirigeant && !v.isComptable)) return new Response("Accès refusé", { status: 403 });
  const year = Number(new URL(req.url).searchParams.get("annee")) || new Date().getFullYear();
  return new Response(await journalCsv(year), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-comptable-pride-${year}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
