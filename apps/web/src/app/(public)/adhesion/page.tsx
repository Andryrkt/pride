import { db, inArray, schema } from "@pride/db";
import { CA_ROLES, TARIFS, formatAriary } from "@pride/shared";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { ApplicationForm } from "./application-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Devenir membre" };

const avantages = [
  ["Se former", "Langues, bureautique, IA, leadership, art oratoire, intelligence financière."],
  ["Développer son réseau", "Rencontrer d'autres membres, échanger, participer à des projets collectifs."],
  ["Construire son avenir", "Stages, emplois, orientation et accompagnement de carrière."],
  ["Entreprendre", "Accompagnement à la création d'activité et échange d'idées."],
];

const steps = [
  ["Parrainage ou entretien", "Être parrainé par un membre du conseil d'administration, ou passer un entretien avec au moins deux de ses membres."],
  ["Dossier en ligne", "Remplir la fiche et joindre les pièces directement sur ce site."],
  ["Agrément du CA", "Le conseil d'administration statue à la majorité de ses membres présents."],
  ["Paiement et carte", "Droit d'entrée et première cotisation par MVola, Orange Money ou Airtel Money. Votre carte de membre est créée."],
];

export default async function AdhesionPage() {
  const ca = await db.query.mandates.findMany({ where: inArray(schema.mandates.role, CA_ROLES), with: { member: true } });
  const sponsors = ca.map((m) => ({ id: m.member.id, name: `${m.member.lastName} ${m.member.firstNames}` }));
  return (
    <>
      <PageHero eyebrow="Devenir membre" title="Rejoindre PRIDe, c'est progresser et aider les autres à progresser" actions={<ButtonLink href="#candidature">Déposer ma candidature</ButtonLink>}>
        Toute personne, sans distinction de sexe ni d'âge, qui accepte les statuts peut adhérer. Les mineurs adhèrent avec l'accord d'un parent, tuteur ou tutrice membre de l'association.
      </PageHero>
      <section id="avantages" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-3xl font-extrabold">Les avantages d'être membre</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {avantages.map(([t, d]) => (
            <Card key={t} className="p-5">
              <h3 className="mb-1.5 text-lg font-bold">{t}</h3>
              <p className="text-[15px] text-muted">{d}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-6 text-3xl font-extrabold">Les 4 étapes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([t, d], i) => (
              <Card key={t} className="flex flex-col gap-2">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-600 font-display font-extrabold text-white">{i + 1}</span>
                <h3 className="text-lg font-bold">{t}</h3>
                <p className="text-[15px] text-muted">{d}</p>
              </Card>
            ))}
          </div>
          <h3 className="mt-10 mb-4 text-2xl font-bold">Catégories et cotisations</h3>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[520px] text-left">
              <thead className="bg-paper text-xs uppercase tracking-wider text-muted">
                <tr><th className="px-5 py-3">Catégorie</th><th className="px-5 py-3">Droit d'entrée</th><th className="px-5 py-3">Cotisation mensuelle</th></tr>
              </thead>
              <tbody>
                {Object.entries(TARIFS).map(([k, t]) => (
                  <tr key={k} className="border-t border-line">
                    <td className="px-5 py-4 font-semibold">{t.label}</td>
                    <td className="px-5 py-4">{formatAriary(t.droitEntree)}</td>
                    <td className="px-5 py-4">{formatAriary(t.cotisationMensuelle)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">Les montants peuvent être révisés chaque année par l'Assemblée générale.</p>
        </div>
      </section>
      <section className="scroll-mt-4 py-14" id="candidature">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-8 px-4 sm:px-6">
          <div className="flex flex-[1_1_280px] flex-col gap-4">
            <Eyebrow>Formulaire</Eyebrow>
            <h2 className="text-3xl font-extrabold">Ma candidature</h2>
            <p className="text-muted">Ce formulaire remplace la fiche de renseignement papier. Pièces à joindre :</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[#2b3832]">
              <li>Certificat de résidence</li>
              <li>Photocopie légalisée de la CIN (acte de naissance pour les mineurs)</li>
              <li>Curriculum vitae</li>
              <li>Lettre de motivation</li>
            </ul>
            <p className="text-sm text-muted">La carte d'adhésion est délivrée après l'agrément.</p>
          </div>
          <Card className="min-w-0 flex-[999_1_560px]">
            <ApplicationForm sponsors={sponsors} />
          </Card>
        </div>
      </section>
    </>
  );
}
