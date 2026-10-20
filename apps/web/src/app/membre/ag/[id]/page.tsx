import { notFound } from "next/navigation";
import { MAJORITES } from "@pride/shared";
import { ProcesVerbal } from "@/components/ag/proces-verbal";
import { PrintButton } from "@/components/ag/print-button";
import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAssembly, KIND_LABELS } from "@/lib/assemblies";
import { requireMember } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";

export default async function MemberAssemblyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const a = await getAssembly(id);
  if (!a || a.status === "PREPARATION") notFound();

  if (a.status === "CLOTUREE" || a.status === "CARENCE") {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <ButtonLink href="/membre/ag" variant="outline" size="sm">Toutes les AG</ButtonLink>
          <PrintButton />
        </div>
        <ProcesVerbal a={a} />
      </>
    );
  }

  return (
    <>
      <PageTitle title={a.title} sub={`${KIND_LABELS[a.kind]}${a.convocationNumber >= 2 ? " · deuxième convocation" : ""}`} />
      <Card className="flex flex-col gap-2 text-[15px]">
        <h2 className="text-xl font-bold">Convocation</h2>
        <p><span className="text-muted">Date : </span>{formatDateTime(a.scheduledAt)}</p>
        <p><span className="text-muted">Lieu : </span>{a.location}</p>
        <h3 className="mt-2 font-bold">Ordre du jour</h3>
        <p className="whitespace-pre-line rounded-xl bg-paper p-3">{a.agenda}</p>
        {a.resolutions.length > 0 && (
          <>
            <h3 className="mt-2 font-bold">Résolutions soumises au vote</h3>
            <ol className="flex flex-col gap-2">
              {a.resolutions.map((r) => (
                <li key={r.id}>
                  <strong>{r.position}. {r.title}</strong>
                  <p className="whitespace-pre-line">{r.text}</p>
                  <p className="text-sm text-muted">{MAJORITES[r.majority].label}</p>
                </li>
              ))}
            </ol>
          </>
        )}
        <p className="mt-2 text-muted">
          {a.convocationNumber >= 2
            ? "Deuxième convocation : l'assemblée délibérera quel que soit le nombre de membres présents."
            : "L'assemblée ne peut voter que si la majorité absolue des membres ayant droit de vote est présente. Les procurations ne sont pas admises."}
        </p>
      </Card>
    </>
  );
}
