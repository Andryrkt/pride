import Link from "next/link";
import { canVoteAtAG } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { ASSEMBLY_STATUS, KIND_LABELS, listAssemblies } from "@/lib/assemblies";
import { requireMember } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";

export default async function MemberAssembliesPage() {
  const { member } = await requireMember();
  // Les AG en préparation ne sont visibles que des dirigeants.
  const assemblies = await listAssemblies(["CONVOQUEE", "EN_SEANCE", "CLOTUREE", "CARENCE"]);
  const votes = canVoteAtAG(member);
  return (
    <>
      <PageTitle title="Assemblées générales" sub="Convocations et procès-verbaux" />
      <p className={votes ? "rounded-xl bg-brand-50 px-4 py-3 text-brand-800" : "rounded-xl bg-paper px-4 py-3"}>
        {votes
          ? "Vous avez le droit de vote à l'AG. Votre présence compte pour le quorum : les procurations ne sont pas admises."
          : "Vous pouvez assister aux AG, mais seuls les membres actifs majeurs votent."}
      </p>
      <Card className="p-0">
        {assemblies.length === 0 ? (
          <p className="p-6 text-muted">Aucune assemblée générale pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {assemblies.map((a) => {
              const [label, tone] = ASSEMBLY_STATUS[a.status];
              return (
                <li key={a.id}>
                  <Link href={`/membre/ag/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-paper">
                    <span className="flex flex-col">
                      <strong>{a.title}</strong>
                      <span className="text-sm text-muted">{KIND_LABELS[a.kind]} · {formatDateTime(a.scheduledAt)} · {a.location}</span>
                    </span>
                    <Badge tone={tone}>{a.status === "CLOTUREE" || a.status === "CARENCE" ? "PV disponible" : label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
