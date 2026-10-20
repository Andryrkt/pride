import { db, eq, schema } from "@pride/db";
import { confirmPayment, failPayment } from "@/lib/dues";

/**
 * Notification de l'opérateur mobile money (à brancher sur MVola / Orange Money / Airtel Money).
 * Protégée par un secret partagé : en-tête « x-pride-secret » = PAYMENTS_WEBHOOK_SECRET.
 * Corps attendu (à adapter au format de chaque opérateur) : { "paymentId": "...", "success": true }.
 */
export async function POST(req: Request) {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-pride-secret") !== secret) return new Response("Accès refusé", { status: 403 });
  const body = (await req.json().catch(() => null)) as { paymentId?: string; success?: boolean } | null;
  if (!body?.paymentId) return new Response("Requête invalide", { status: 400 });
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, body.paymentId) });
  if (!p) return new Response("Introuvable", { status: 404 });
  if (body.success) await confirmPayment(p.id);
  else await failPayment(p.id);
  return Response.json({ ok: true });
}
