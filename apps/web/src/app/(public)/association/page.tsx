import { asc, db, schema } from "@pride/db";
import { COMMISSIONS, mandateActive, ROLE_LABELS, type MandateRole } from "@pride/shared";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "L'association" };

const ORDER: MandateRole[] = ["PRESIDENT", "VICE_PRESIDENT", "CONSEILLER", "COORDONNATEUR", "SECRETAIRE_GENERALE", "TRESORIER"];

const organes = [
  ["Assemblée générale", "Organe suprême, réunit les membres actifs au moins une fois par an. Elle élit le conseil d'administration."],
  ["Conseil d'administration", "Sept membres élus pour cinq ans. Il définit la stratégie, valide les grands projets et contrôle la gestion."],
  ["Bureau exécutif", "Coordonnateur, Secrétaire générale et Trésorier. Il dirige l'activité courante de l'association."],
  ["Commissions de travail", "Équipes de membres qui réalisent concrètement les actions de l'association."],
];

export default async function AssociationPage() {
  const today = new Date();
  const mandates = await db.query.mandates.findMany({ with: { member: true }, orderBy: asc(schema.mandates.startsAt) });
  const active = mandates
    .filter((m) => ORDER.includes(m.role as MandateRole) && (!m.endsAt || new Date(m.endsAt) >= today))
    .sort((a, b) => ORDER.indexOf(a.role as MandateRole) - ORDER.indexOf(b.role as MandateRole));
  const ca = active.filter((m) => ["PRESIDENT", "VICE_PRESIDENT", "CONSEILLER"].includes(m.role));
  const bureau = active.filter((m) => ["COORDONNATEUR", "SECRETAIRE_GENERALE", "TRESORIER"].includes(m.role));
  const hasTresorier = bureau.some((m) => m.role === "TRESORIER");
  const responsables = new Map(
    mandates.filter((m) => m.role === "RESPONSABLE_COMMISSION" && m.commissionId && mandateActive(m, today)).map((m) => [m.commissionId!, m.member]),
  );
  const commissionIds = new Map((await db.query.commissions.findMany()).map((c) => [c.slug, c.id]));

  const Person = ({ name, role, bureau }: { name: string; role: string; bureau?: boolean }) => (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-full font-bold ${bureau ? "bg-flame-50 text-flame-800" : "bg-brand-50 text-brand-800"}`} aria-hidden>
        {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
      </span>
      <div>
        <div className="font-bold">{name}</div>
        <div className="text-sm font-semibold text-brand-600">{role}</div>
      </div>
    </div>
  );

  return (
    <>
      <PageHero eyebrow="L'association" title="Une organisation claire et démocratique">
        Créée à Analamahitsy, Antananarivo, PRIDe est régie par l'Ordonnance 60-133 du 3 octobre 1960. Elle est apolitique, non confessionnelle et ouverte à toute personne, sans distinction de sexe ni d'âge, qui accepte ses statuts.
      </PageHero>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="mb-6 text-3xl font-extrabold">Nos organes</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {organes.map(([t, d], i) => (
            <Card key={t} className={`border-t-[6px] ${["border-t-brand-800", "border-t-brand-600", "border-t-[#3e9a6c]", "border-t-flame-600"][i]}`}>
              <h3 className="mb-2 text-xl font-bold">{t}</h3>
              <p className="text-muted">{d}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
          <div className="flex flex-col gap-2.5">
            <Eyebrow>L'équipe dirigeante</Eyebrow>
            <h2 className="text-3xl font-extrabold">Conseil d'administration</h2>
            <p className="text-muted">Élu par l'Assemblée générale du 27 septembre 2026.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ca.map((m) => (
              <Person key={m.id} name={`${m.member.lastName} ${m.member.firstNames}`} role={ROLE_LABELS[m.role as MandateRole]} />
            ))}
          </div>
          <h2 className="mt-6 text-3xl font-extrabold">Bureau exécutif</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {bureau.map((m) => (
              <Person key={m.id} name={`${m.member.lastName} ${m.member.firstNames}`} role={ROLE_LABELS[m.role as MandateRole]} bureau />
            ))}
            {!hasTresorier && <Person name="Poste à pourvoir" role="Trésorier" bureau />}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex max-w-2xl flex-col gap-2.5">
          <Eyebrow>Commissions de travail</Eyebrow>
          <h2 className="text-3xl font-extrabold">Chaque membre peut rejoindre une commission selon ses compétences et ses envies</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMMISSIONS.map((c) => (
            <Card key={c.slug} className="p-5">
              <h3 className="mb-1 text-lg font-bold">{c.name}</h3>
              <p className="text-[15px] text-muted">{c.description}</p>
              {(() => {
                const r = responsables.get(commissionIds.get(c.slug) ?? "");
                return r && <p className="mt-2 text-sm font-semibold text-brand-600">Responsable : {r.lastName} {r.firstNames}</p>;
              })()}
            </Card>
          ))}
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2">
          <Card className="flex flex-col gap-2.5 bg-paper">
            <h3 className="text-[22px] font-bold">Sections régionales et partenaires</h3>
            <p className="text-muted">Le conseil d'administration peut créer des sections régionales à Madagascar. Hors de Madagascar, PRIDe signe des conventions de partenariat avec des associations locales. Les membres résidant à l'étranger peuvent adhérer directement.</p>
          </Card>
          <Card className="flex flex-col gap-3.5 bg-paper">
            <h3 className="text-[22px] font-bold">Documents officiels</h3>
            {/* shortcut: pas encore de PDF en ligne ; remplacer par des liens vers public/documents/ dès que les fichiers sont fournis. */}
            <p className="text-muted">Les statuts, le règlement intérieur et le document de présentation sont disponibles sur simple demande.</p>
            <ButtonLink href="/contact" variant="outline" size="sm" className="self-start">Demander les documents</ButtonLink>
          </Card>
        </div>
      </section>
    </>
  );
}
