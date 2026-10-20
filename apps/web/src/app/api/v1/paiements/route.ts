import { paymentRequestSchema } from "@pride/shared";
import { json, memberFromRequest } from "@/lib/api";
import { PaymentError, payDues } from "@/lib/dues";

export async function POST(req: Request) {
  const v = await memberFromRequest(req);
  if (!v) return json({ error: "Non connecté" }, 401);
  const parsed = paymentRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0]!.message }, 400);
  try {
    const p = await payDues({ memberId: v.member.id, ...parsed.data });
    return json({ status: p?.status, receiptNumber: p?.receiptNumber ?? null });
  } catch (e) {
    return json({ error: e instanceof PaymentError ? e.message : "Paiement impossible" }, 400);
  }
}
