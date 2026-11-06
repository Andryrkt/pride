import { notFound } from "next/navigation";
import { ResourceBody } from "@/components/site/resources";
import { ButtonLink } from "@/components/ui/button";
import { getResource } from "@/lib/resources";

export const dynamic = "force-dynamic";

export default async function PublicResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getResource(id, false);
  if (!r) notFound();
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-14 sm:px-6">
      <ButtonLink href="/ressources" variant="outline" size="sm" className="self-start">Toutes les ressources</ButtonLink>
      <h1 className="text-3xl font-extrabold sm:text-4xl">{r.title}</h1>
      <ResourceBody r={r} />
    </section>
  );
}
