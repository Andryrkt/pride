import { desc, db, inArray, schema } from "@pride/db";
import { OFFER_TYPES } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { OFFER_STATUS } from "@/lib/network";
import { requireDirigeant } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { closeOfferLeaderAction, decideOfferAction } from "../actions";

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  await requireDirigeant();
  const offers = await db.query.offers.findMany({
    where: inArray(schema.offers.status, ["PROPOSEE", "PUBLIEE"]),
    orderBy: desc(schema.offers.createdAt),
    with: { author: true, interests: true },
  });
  const pending = offers.filter((o) => o.status === "PROPOSEE");
  const published = offers.filter((o) => o.status === "PUBLIEE");

  return (
    <>
      <PageTitle title="Offres des membres" sub="Stages, emplois et bénévolat proposés par les membres : vérifiez chaque offre avant de la publier (pas d'arnaque, pas de frais demandés aux candidats)." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">À valider ({pending.length})</h2>
        {pending.length === 0 && <p className="text-muted">Aucune offre en attente.</p>}
        {pending.map((o) => (
          <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{OFFER_TYPES[o.type]}</Badge>
              <span className="text-sm text-muted">Proposée le {formatDate(o.createdAt)} par {o.author.lastName} {o.author.firstNames} ({o.author.number})</span>
            </div>
            <h3 className="text-lg font-bold">{o.title}</h3>
            <p className="whitespace-pre-line">{o.description}</p>
            {o.location && <p className="text-sm text-muted">Lieu : {o.location}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              <ActionForm action={decideOfferAction.bind(null, o.id, "PUBLIEE")} className="flex flex-col gap-2">
                <Input label="Message à l'auteur (facultatif)" name="note" id={`note-ok-${o.id}`} />
                <SubmitButton className="self-start">Publier</SubmitButton>
              </ActionForm>
              <ActionForm action={decideOfferAction.bind(null, o.id, "REFUSEE")} className="flex flex-col gap-2">
                <Input label="Motif du refus" name="note" id={`note-ko-${o.id}`} required />
                <SubmitButton variant="danger" className="self-start">Refuser</SubmitButton>
              </ActionForm>
            </div>
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Publiées ({published.length})</h2>
        {published.length === 0 && <p className="text-muted">Aucune offre publiée.</p>}
        <ul className="divide-y divide-line">
          {published.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-semibold">{o.title}</div>
                <div className="text-sm text-muted">
                  {OFFER_TYPES[o.type]} · {o.author.lastName} {o.author.firstNames} · {o.interests.length} membre(s) intéressé(s)
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={OFFER_STATUS[o.status][1]}>{OFFER_STATUS[o.status][0]}</Badge>
                <ActionForm action={closeOfferLeaderAction.bind(null, o.id)} className="flex">
                  <SubmitButton variant="outline" size="sm">Clôturer</SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
