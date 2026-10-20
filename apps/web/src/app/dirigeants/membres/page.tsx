import { and, asc, db, eq, ilike, or, schema, type SQL } from "@pride/db";
import { TARIFS, type MemberCategory } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function RegistryPage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string }> }) {
  const { q = "", categorie = "" } = await searchParams;
  const filters: SQL[] = [];
  if (q) filters.push(or(ilike(schema.members.lastName, `%${q}%`), ilike(schema.members.firstNames, `%${q}%`), ilike(schema.members.number, `%${q}%`))!);
  if (categorie in TARIFS) filters.push(eq(schema.members.category, categorie as MemberCategory));
  const members = await db.query.members.findMany({
    where: filters.length ? and(...filters) : undefined,
    orderBy: asc(schema.members.number),
    with: { dues: true, mandates: true },
  });
  return (
    <>
      <PageTitle title="Registre des membres" sub={`${members.length} membre(s)`} />
      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-[1_1_260px] flex-col gap-1.5 text-sm font-semibold">
          Rechercher
          <input name="q" defaultValue={q} placeholder="Nom ou numéro" className="min-h-12 rounded-xl border-[1.5px] border-[#c3ccc5] bg-white px-3.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Catégorie
          <select name="categorie" defaultValue={categorie} className="min-h-12 rounded-xl border-[1.5px] border-[#c3ccc5] bg-white px-3.5 font-normal">
            <option value="">Toutes</option>
            {Object.entries(TARIFS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </label>
        <button className="min-h-12 rounded-full bg-brand-600 px-6 font-semibold text-white">Filtrer</button>
      </form>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-[14.5px]">
          <thead className="bg-paper text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">N°</th><th>Nom</th><th>Catégorie</th><th>Depuis</th><th>Téléphone</th><th>Cotisation</th></tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const late = m.dues.filter((d) => d.status === "A_PAYER").length;
              return (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono text-sm">{m.number}</td>
                  <td className="font-semibold">{m.lastName} {m.firstNames}{m.mandates.length > 0 && <Badge tone="dark" className="ml-2">Dirigeant</Badge>}</td>
                  <td>{TARIFS[m.category as MemberCategory].label}</td>
                  <td>{formatDate(m.joinedAt)}</td>
                  <td>{m.phone ?? "—"}</td>
                  <td><Badge tone={late ? "red" : "green"}>{late ? `${late} échéance(s) à payer` : "À jour"}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
