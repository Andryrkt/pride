import Link from "next/link";
import { AG_DELAI_CONVOCATION_JOURS } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input, RequiredLegend, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ASSEMBLY_STATUS, KIND_LABELS, listAssemblies } from "@/lib/assemblies";
import { canManageAssemblies, requireDirigeant } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { createAssemblyAction } from "./actions";

const DEFAULT_AGENDA = "1. Rapport moral du conseil d'administration\n2. Rapport financier et quitus\n3. Programme d'activités et budget\n4. Questions diverses";

export default async function AssembliesPage() {
  const v = await requireDirigeant();
  const canManage = canManageAssemblies(v);
  const assemblies = await listAssemblies();
  // Proposition : dans un mois, à 9 h (heure locale du serveur)
  const d = new Date(Date.now() + 30 * 86_400_000);
  const suggested = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T09:00`;

  return (
    <>
      <PageTitle title="Assemblées générales" sub={`Convocation ${AG_DELAI_CONVOCATION_JOURS} jours avant, quorum de la majorité absolue des membres actifs majeurs, procès-verbal généré.`} />
      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <Card className="p-0">
          {assemblies.length === 0 ? (
            <p className="p-6 text-muted">Aucune assemblée générale pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-line">
              {assemblies.map((a) => {
                const [label, tone] = ASSEMBLY_STATUS[a.status];
                return (
                  <li key={a.id}>
                    <Link href={`/dirigeants/ag/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-paper">
                      <span className="flex flex-col">
                        <strong>{a.title}</strong>
                        <span className="text-sm text-muted">
                          {a.reference} · {KIND_LABELS[a.kind]}{a.convocationNumber >= 2 ? " · 2ᵉ convocation" : ""} · {formatDateTime(a.scheduledAt)} · {a.resolutions.length} résolution(s)
                        </span>
                      </span>
                      <Badge tone={tone}>{label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        {canManage ? (
          <Card>
            <h2 className="mb-3 text-xl font-bold">Préparer une AG</h2>
            <ActionForm action={createAssemblyAction}>
              <RequiredLegend />
              <Select label="Type" name="kind" required defaultValue="ORDINAIRE">
                <option value="ORDINAIRE">{KIND_LABELS.ORDINAIRE}</option>
                <option value="EXTRAORDINAIRE">{KIND_LABELS.EXTRAORDINAIRE}</option>
              </Select>
              <Input label="Intitulé" name="title" required defaultValue={`Assemblée générale ${d.getFullYear()}`} />
              <Input label="Date et heure" name="scheduledAt" type="datetime-local" required defaultValue={suggested}
                hint={`La convocation doit partir au moins ${AG_DELAI_CONVOCATION_JOURS} jours avant.`} />
              <Input label="Lieu" name="location" required defaultValue="CLT Tsiadana" />
              <Textarea label="Ordre du jour" name="agenda" required defaultValue={DEFAULT_AGENDA} rows={6} />
              <SubmitButton className="self-start">Créer l'AG</SubmitButton>
            </ActionForm>
          </Card>
        ) : (
          <p className="self-start rounded-xl bg-sun-50 px-4 py-3 text-sun-800">La préparation des AG est réservée au conseil d'administration et au Secrétariat général.</p>
        )}
      </div>
    </>
  );
}
