import QRCode from "qrcode";
import { env } from "@/lib/env";
import { getViewerFromRequest } from "@/lib/session";

/** Variantes proposées au téléchargement. */
const VARIANTS = {
  png: { dark: "#0b3f2a", type: "png" },
  noir: { dark: "#000000", type: "png" },
  svg: { dark: "#0b3f2a", type: "svg" },
} as const;

/**
 * Code QR qui mène au site public (adresse configurée : https://pride.org.mg en production), pour les affiches et
 * les publications. Réservé à l'administrateur. `?format=png` (vert), `noir` ou `svg` ; `?apercu=1` : affiché sans téléchargement.
 */
export async function GET(req: Request) {
  const v = await getViewerFromRequest(req);
  if (!v?.roles.includes("ADMIN_TECHNIQUE")) return new Response("Réservé à l'administrateur.", { status: 403 });
  const params = new URL(req.url).searchParams;
  const key = (params.get("format") ?? "png") as keyof typeof VARIANTS;
  const variant = VARIANTS[key] ?? VARIANTS.png;
  // Correction d'erreur la plus forte (H) : lisible même un peu abîmé ou mal imprimé ; marge blanche de 4 modules.
  const opts = { errorCorrectionLevel: "H" as const, margin: 4, color: { dark: variant.dark, light: "#ffffff" } };
  const host = new URL(env.appUrl).host;
  const body = variant.type === "svg" ? await QRCode.toString(env.appUrl, { ...opts, type: "svg" }) : new Uint8Array(await QRCode.toBuffer(env.appUrl, { ...opts, width: 1200 }));
  const name = `qr-${host.replaceAll(".", "-")}${key === "noir" ? "-noir" : ""}.${variant.type}`;
  return new Response(body, {
    headers: {
      "Content-Type": variant.type === "svg" ? "image/svg+xml" : "image/png",
      "Content-Disposition": `${params.get("apercu") ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
