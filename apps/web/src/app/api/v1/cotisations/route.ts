import { desc, db, eq, schema } from "@pride/db";
import { json, memberFromRequest } from "@/lib/api";
import { dueLabel, ensureDues, listDues } from "@/lib/dues";

export async function GET(req: Request) {
  const v = await memberFromRequest(req);
  if (!v) return json({ error: "Non connecté" }, 401);
  await ensureDues(v.member);
  const [dues, payments] = await Promise.all([
    listDues(v.member.id),
    db.query.payments.findMany({ where: eq(schema.payments.memberId, v.member.id), orderBy: desc(schema.payments.createdAt) }),
  ]);
  return json({
    dues: dues.map((d) => ({ id: d.id, label: dueLabel(d), kind: d.kind, period: d.period, amount: d.amount, status: d.status })),
    payments: payments.map((p) => ({ id: p.id, amount: p.amount, provider: p.provider, status: p.status, receiptNumber: p.receiptNumber, createdAt: p.createdAt })),
  });
}
