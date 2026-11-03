import { desc, db, eq, schema } from "@pride/db";
import { json, memberFromRequest } from "@/lib/api";
import { dueLabel, ensureDues, listDues, listPaymentAccounts } from "@/lib/dues";

export async function GET(req: Request) {
  const v = await memberFromRequest(req);
  if (!v) return json({ error: "Non connecté" }, 401);
  await ensureDues(v.member);
  const [dues, payments, accounts] = await Promise.all([
    listDues(v.member.id),
    db.query.payments.findMany({ where: eq(schema.payments.memberId, v.member.id), orderBy: desc(schema.payments.createdAt) }),
    listPaymentAccounts(),
  ]);
  return json({
    dues: dues.map((d) => ({ id: d.id, label: dueLabel(d), kind: d.kind, period: d.period, amount: d.amount, status: d.status, pending: !!d.paymentId })),
    payments: payments.map((p) => ({ id: p.id, amount: p.amount, provider: p.provider, status: p.status, receiptNumber: p.receiptNumber, reference: p.providerRef, rejectionReason: p.rejectionReason, createdAt: p.createdAt })),
    accounts: accounts.map(({ provider, number, holder }) => ({ provider, number, holder })),
  });
}
