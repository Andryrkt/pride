import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";

export const metadata = { title: "Nos réalisations" };

type Story = { id: string; tag: string; title: string; meta?: string; text: string[]; photos: [string, string][]; press?: boolean };

const stories: Story[] = [
  {
    id: "climat",
    tag: "Environnement",
    title: "Week-end Action Climat, Antananarivo",
    meta: "Samedi 26 janvier 2019 · partenaire de la mobilisation, aux côtés de l'association JEUNE et d'autres organisations de jeunesse",
    text: ["PRIDe s'est engagée dans le mouvement mondial pour le climat : marche pour le climat, nettoyage des rues, éco-jogging et débats. Gants aux mains et sacs à la main, nos membres ont ramassé les déchets dans les rues de la capitale, au côté de nombreux jeunes."],
    photos: [["climat-marche", "Marche pour le climat"], ["climat-nettoyage", "Nettoyage des rues"], ["climat-partenaires", "PRIDe parmi les partenaires"]],
  },
  {
    id: "akany",
    tag: "Solidarité",
    title: "Action solidaire à l'Akany Avoko, Ambohidratrimo",
    meta: "En partenariat avec l'ACAT Madagascar",
    text: [
      "À l'occasion des fêtes de fin d'année, PRIDe et l'ACAT Madagascar ont rendu visite aux enfants et aux jeunes du centre Akany Avoko, pour leur apporter soutien et réconfort.",
      "PRIDe y a également porté un projet de formation à la fabrication de « charbon vert » (charbon écologique) : une compétence pratique qui prépare l'avenir des jeunes tout en protégeant l'environnement.",
    ],
    photos: [["akany-presse", "Article de presse sur l'action"]],
    press: true,
  },
  {
    id: "ateliers",
    tag: "Sensibilisation",
    title: "Ateliers et sensibilisation",
    text: ["PRIDe organise des ateliers participatifs où les jeunes réfléchissent ensemble, échangent leurs idées et créent leurs propres messages de sensibilisation, notamment sur le respect de l'environnement."],
    photos: [["atelier-participatif", "Atelier participatif"], ["atelier-messages", "Création de messages de sensibilisation"]],
  },
  {
    id: "orientation",
    tag: "Orientation",
    title: "Conférence d'orientation pour les jeunes",
    text: [
      "Les intervenants ont présenté les différents types d'orientation (scolaire, professionnelle, entrepreneuriale, pour les demandeurs d'emploi et universitaire), puis ont détaillé l'orientation après le baccalauréat à Madagascar : parcours, établissements et débouchés.",
      "La conférence s'est prolongée par des échanges directs avec les participants, pour répondre à leurs questions et les conseiller individuellement.",
    ],
    photos: [["conf-universitaire", "Présentation de l'orientation universitaire"], ["conf-types", "Les différents types d'orientation"], ["conf-echanges", "Échanges avec les jeunes"]],
  },
  {
    id: "vie",
    tag: "Vie associative",
    title: "Une vie associative chaleureuse",
    text: ["Rencontres de début d'année, sorties et moments de partage : chez PRIDe, l'esprit d'équipe se construit aussi en dehors des activités."],
    photos: [["vie-equipe", "L'équipe PRIDe"], ["vie-fete-2020", "Fête de début d'année 2020"], ["vie-sortie", "Sortie entre membres"]],
  },
];

function StoryText({ s }: { s: Story }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <Eyebrow>{s.tag}</Eyebrow>
      <h2 className="text-3xl font-extrabold">{s.title}</h2>
      {s.meta && <p className="font-semibold text-[#3a4740]">{s.meta}</p>}
      {s.text.map((t) => (
        <p key={t} className="text-[17px] text-[#2b3832]">{t}</p>
      ))}
      {s.press && <p className="rounded-xl bg-brand-50 px-4 py-3.5 font-semibold text-brand-800">Cette action a été relayée par la presse nationale.</p>}
    </div>
  );
}

export default function RealisationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Nos réalisations"
        title="PRIDe agit sur le terrain"
        actions={stories.map((s) => (
          <Link key={s.id} href={`#${s.id}`} className="inline-flex min-h-10 items-center rounded-full bg-brand-50 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-100">
            {s.tag}
          </Link>
        ))}
        aside={<Image src="/images/realisations/vie-equipe.jpg" alt="L'équipe PRIDe réunie devant un bâtiment" width={560} height={340} priority className="h-85 w-full max-w-140 flex-[1_1_420px] rounded-[28px] object-cover" />}
      >
        Depuis sa création, PRIDe agit pour l'environnement, pour la solidarité et pour la jeunesse. Voici quelques-unes de nos actions.
      </PageHero>
      {stories.map((s, i) => (
        <section key={s.id} id={s.id} className={`scroll-mt-4 py-16 ${i % 2 ? "bg-white" : ""}`}>
          {s.press ? (
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-10 px-4 sm:px-6">
              <div className="flex-[1_1_460px]"><StoryText s={s} /></div>
              <figure className="flex max-w-100 flex-[1_1_320px] flex-col gap-2">
                <Image src={`/images/realisations/${s.photos[0]![0]}.jpg`} alt={s.photos[0]![1]} width={400} height={480} className="h-120 w-full rounded-2xl border border-line object-cover object-top" />
                <figcaption className="text-sm font-semibold text-[#3a4740]">{s.photos[0]![1]}</figcaption>
              </figure>
            </div>
          ) : (
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
              <StoryText s={s} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.photos.map(([file, caption]) => (
                  <figure key={file} className="flex flex-col gap-2">
                    <Image src={`/images/realisations/${file}.jpg`} alt={caption} width={600} height={450} className="h-64 w-full rounded-2xl object-cover object-top" />
                    <figcaption className="text-sm font-semibold text-[#3a4740]">{caption}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}
      <section className="bg-brand-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-2.5">
            <h2 className="text-4xl font-extrabold text-white">Participez aux prochaines actions</h2>
            <p className="text-lg text-brand-100">Recevoir, apprendre, puis transmettre : rejoignez une communauté qui agit.</p>
          </div>
          <ButtonLink href="/adhesion" variant="white">Devenir membre</ButtonLink>
        </div>
      </section>
    </>
  );
}
