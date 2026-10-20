import { TARIFS, type MemberCategory } from "@pride/shared";
import { json, memberFromRequest } from "@/lib/api";
import { ensureDues, listDues } from "@/lib/dues";

export async function GET(req: Request) {
  const v = await memberFromRequest(req);
  if (!v) return json({ error: "Non connecté" }, 401);
  const m = v.member;
  await ensureDues(m);
  const dues = await listDues(m.id);
  const unpaid = dues.filter((d) => d.status === "A_PAYER");
  return json({
    member: {
      id: m.id,
      number: m.number,
      lastName: m.lastName,
      firstNames: m.firstNames,
      category: m.category,
      categoryLabel: TARIFS[m.category as MemberCategory].label,
      joinedAt: m.joinedAt,
      phone: m.phone,
      skills: m.skills,
    },
    roles: v.roles,
    dues: { unpaidCount: unpaid.length, unpaidTotal: unpaid.reduce((s, d) => s + d.amount, 0) },
  });
}
