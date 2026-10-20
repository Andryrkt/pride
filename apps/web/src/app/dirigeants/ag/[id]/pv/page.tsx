import { notFound } from "next/navigation";
import { ProcesVerbal } from "@/components/ag/proces-verbal";
import { PrintButton } from "@/components/ag/print-button";
import { ButtonLink } from "@/components/ui/button";
import { getAssembly } from "@/lib/assemblies";

export default async function AssemblyPvPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAssembly(id);
  if (!a) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ButtonLink href={`/dirigeants/ag/${a.id}`} variant="outline" size="sm">Retour à l'AG</ButtonLink>
        <PrintButton />
      </div>
      <ProcesVerbal a={a} />
    </>
  );
}
