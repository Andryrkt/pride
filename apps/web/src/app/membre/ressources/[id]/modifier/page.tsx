import { notFound, redirect } from "next/navigation";
import { PageTitle } from "@/components/site/app-shell";
import { LearnTabs } from "@/components/site/resources";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canPublishResources, getResource } from "@/lib/resources";
import { requireMember } from "@/lib/session";
import { updateResourceAction } from "../../../actions";
import { ResourceForm } from "../../resource-form";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await requireMember();
  if (!(await canPublishResources(v))) redirect(`/membre/ressources/${id}`);
  const r = await getResource(id, true);
  if (!r) notFound();
  return (
    <>
      <PageTitle title="Modifier la ressource" sub={r.title}>
        <ButtonLink href={`/membre/ressources/${r.id}`} variant="outline" size="sm">Annuler</ButtonLink>
      </PageTitle>
      <LearnTabs current="ressources" />
      <Card>
        <ResourceForm action={updateResourceAction.bind(null, r.id)} values={r} submitLabel="Enregistrer les modifications" />
      </Card>
    </>
  );
}
