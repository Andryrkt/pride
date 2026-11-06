import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/app-shell";
import { LearnTabs, ResourceBody } from "@/components/site/resources";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { canPublishResources, getResource } from "@/lib/resources";
import { requireMember } from "@/lib/session";
import { archiveResourceAction } from "../../actions";

export default async function ResourcePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  const v = await requireMember();
  const r = await getResource(id, true);
  if (!r) notFound();
  const canPublish = await canPublishResources(v);
  return (
    <>
      <PageTitle title={r.title}>
        <ButtonLink href="/membre/ressources" variant="outline" size="sm">Toutes les ressources</ButtonLink>
      </PageTitle>
      <LearnTabs current="ressources" />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      <ResourceBody r={r} />
      {canPublish && (
        <div className="flex flex-wrap items-start gap-3">
          <ButtonLink href={`/membre/ressources/${r.id}/modifier`} variant="outline" size="sm">Modifier</ButtonLink>
          <ActionForm action={archiveResourceAction.bind(null, r.id)} className="flex flex-col items-start gap-2">
            <SubmitButton variant="danger" size="sm">Retirer cette ressource</SubmitButton>
            <p className="text-sm text-muted">Elle passe aux archives : elle n'est plus visible, mais n'est pas supprimée.</p>
          </ActionForm>
        </div>
      )}
    </>
  );
}
