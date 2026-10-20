import Image from "next/image";
import Link from "next/link";
import { AIDE_SOLIDARITE, formatAriary } from "@pride/shared";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";

const axes = [
  ["Développer les compétences", "Des formations pratiques et utiles pour la vie professionnelle et personnelle."],
  ["Accompagner les jeunes", "Orienter, conseiller et soutenir chaque membre dans la construction de son parcours."],
  ["Créer des opportunités", "Ouvrir l'accès aux stages, aux emplois, aux projets et à l'entrepreneuriat."],
  ["Favoriser l'entraide", "Mettre en relation ceux qui ont des compétences et ceux qui en ont besoin."],
];

const valeurs = [
  ["P", "Partage", "Partager ses connaissances, ses expériences et ses compétences pour faire grandir les autres."],
  ["R", "Responsabilité", "S'engager, tenir ses engagements et contribuer activement aux projets de l'association."],
  ["I", "Intégrité", "Agir avec respect, honnêteté et transparence, envers les membres, les partenaires et la nature."],
  ["De", "Développement", "Développer les personnes, les compétences et les initiatives au service d'un avenir durable."],
];

const formations = [
  ["Langues", "Communiquer avec aisance pour les études, le travail et l'international."],
  ["Bureautique", "Traitement de texte, tableur, présentation, messagerie."],
  ["Intelligence artificielle", "Comprendre et utiliser les outils d'IA pour gagner en efficacité."],
  ["Leadership", "Diriger une équipe, prendre des initiatives et mener des projets."],
  ["Art oratoire", "Prendre la parole en public, convaincre et présenter ses idées."],
  ["Autodiscipline", "Organiser son temps, tenir ses objectifs, prendre de bonnes habitudes."],
  ["Intelligence financière", "Gérer son budget, épargner, investir et préparer ses projets."],
  ["Développement personnel", "Confiance en soi et compétences relationnelles."],
];

const opportunites = [
  ["Projets", "Projets collectifs portés par les membres et projets de développement communautaire."],
  ["Réseautage", "Rencontres régulières, partage d'expériences et relations professionnelles durables."],
  ["Stages et emplois", "Offres diffusées aux membres, recommandations, préparation des CV et entretiens."],
  ["Partenariats", "Organismes publics et privés, nationaux et internationaux, sections régionales."],
];

const realisations = [
  { href: "/realisations#climat", img: "climat-nettoyage", alt: "Membres ramassant des déchets lors du Week-end Action Climat", tag: "Environnement · janvier 2019", title: "Week-end Action Climat à Antananarivo" },
  { href: "/realisations#akany", img: "akany-presse", alt: "Article de presse sur l'action à l'Akany Avoko", tag: "Solidarité · avec l'ACAT Madagascar", title: "Visite et formation au charbon vert à l'Akany Avoko" },
  { href: "/realisations#orientation", img: "conf-types", alt: "Conférence d'orientation pour les jeunes", tag: "Orientation", title: "Conférence d'orientation après le bac" },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Eyebrow>Association · Antananarivo, Madagascar</Eyebrow>
            <h1 className="text-5xl font-extrabold sm:text-6xl">Apprendre, partager et grandir ensemble</h1>
            <p className="max-w-[34ch] text-xl text-[#3a4740]">Une communauté qui développe les compétences et crée des opportunités pour l'avenir des jeunes.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/adhesion">Devenir membre</ButtonLink>
              <ButtonLink href="/association" variant="outline">Découvrir l'association</ButtonLink>
            </div>
            <p className="text-sm text-muted">Partage · Responsabilité · Intégrité pour le Développement</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Image src="/images/realisations/vie-equipe.jpg" alt="L'équipe PRIDe réunie" width={720} height={540} className="col-span-2 h-64 w-full rounded-3xl object-cover" priority />
            <Image src="/images/realisations/conf-universitaire.jpg" alt="Conférence d'orientation organisée par PRIDe" width={500} height={375} className="h-44 w-full rounded-3xl object-cover" />
            <div className="flex h-44 flex-col justify-between rounded-3xl bg-brand-600 p-6 text-white">
              <span className="font-display text-xl font-extrabold leading-tight">Recevoir, apprendre, puis transmettre.</span>
              <span className="text-sm text-brand-100">Le cercle vertueux de PRIDe</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Eyebrow>Pourquoi PRIDe existe</Eyebrow>
          <h2 className="text-4xl font-extrabold">Le trait d'union entre ceux qui veulent aider et ceux qui en ont besoin</h2>
        </div>
        <div className="flex flex-col gap-4 text-[17px] text-[#2b3832]">
          <p>Beaucoup de jeunes ont du potentiel mais manquent de formation, de réseau ou d'accompagnement pour réussir leur entrée dans la vie professionnelle. À l'inverse, de nombreuses personnes ont des savoir-faire et l'envie d'aider, sans toujours savoir comment.</p>
          <p>PRIDe est née d'une conviction simple : chacun possède des compétences qui peuvent servir aux autres. En les partageant, nous faisons grandir les personnes et nous contribuons au développement durable de notre communauté.</p>
          <p className="rounded-2xl bg-brand-800 p-6 text-lg text-white">
            <strong className="text-[#9fd8b8]">Notre vision : </strong>une jeunesse compétente, responsable et solidaire, qui construit son avenir et contribue au développement de sa communauté.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Eyebrow className="mb-3">Nos 4 axes</Eyebrow>
        <h2 className="mb-8 text-4xl font-extrabold">Ce que nous faisons, concrètement</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {axes.map(([t, d], i) => (
            <Card key={t} className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 font-display font-extrabold text-brand-800">0{i + 1}</span>
              <h3 className="text-xl font-bold">{t}</h3>
              <p className="text-muted">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Eyebrow className="mb-3">Nos valeurs</Eyebrow>
          <h2 className="mb-8 text-4xl font-extrabold">Chaque lettre de PRIDe est un engagement</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {valeurs.map(([l, t, d]) => (
              <div key={t} className={`flex flex-col gap-3 rounded-2xl p-6 ${l === "De" ? "bg-flame-50" : "bg-brand-50"}`}>
                <span className={`font-display text-6xl font-extrabold ${l === "De" ? "text-flame-600" : "text-brand-600"}`}>{l}</span>
                <h3 className="text-xl font-bold">{t}</h3>
                <p className="text-[#2b3832]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="formations" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-2xl flex-col gap-3">
            <Eyebrow>Formations</Eyebrow>
            <h2 className="text-4xl font-extrabold">Des formations animées par les membres eux-mêmes</h2>
            <p className="text-[17px] text-muted">Conçues par la Commission formation et projets, les thèmes évoluent selon les besoins des membres.</p>
          </div>
          <ButtonLink href="/adhesion" variant="outline">S'inscrire en devenant membre</ButtonLink>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {formations.map(([t, d]) => (
            <Card key={t} className="p-5">
              <h3 className="mb-1.5 text-lg font-bold">{t}</h3>
              <p className="text-[14.5px] text-muted">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="opportunites" className="bg-white py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <Eyebrow>Opportunités</Eyebrow>
            <h2 className="text-4xl font-extrabold">Chaque compétence partagée peut devenir une opportunité pour quelqu'un d'autre</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {opportunites.map(([t, d]) => (
              <Card key={t} className="flex flex-col gap-2.5">
                <h3 className="text-xl font-bold">{t}</h3>
                <p className="text-muted">{d}</p>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-7 rounded-2xl border border-[#f1c9c3] bg-[#fff7f5] p-7">
            <div className="flex flex-[1_1_420px] flex-col gap-2">
              <h3 className="text-[22px] font-bold">PRIDe est aussi une famille</h3>
              <p className="text-[#3a4740]">
                Lors d'un événement heureux ou douloureux touchant un membre, l'association lui verse {formatAriary(AIDE_SOLIDARITE.membre)}, et {formatAriary(AIDE_SOLIDARITE.famille)} à sa famille proche. En cas de décès, deux représentants assistent à l'enterrement, aux frais de l'association.
              </p>
            </div>
            <ButtonLink href="/adhesion#avantages" variant="outline">Voir les avantages membres</ButtonLink>
          </div>
        </div>
      </section>

      <section id="realisations" className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-2xl flex-col gap-3">
            <Eyebrow>Nos réalisations</Eyebrow>
            <h2 className="text-4xl font-extrabold">PRIDe agit sur le terrain : environnement, solidarité, jeunesse</h2>
          </div>
          <ButtonLink href="/realisations" variant="outline">Voir toutes nos actions</ButtonLink>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {realisations.map((r) => (
            <Link key={r.href} href={r.href} className="group flex flex-col gap-3">
              <Image src={`/images/realisations/${r.img}.jpg`} alt={r.alt} width={600} height={440} className="h-56 w-full rounded-2xl object-cover object-top" />
              <Eyebrow>{r.tag}</Eyebrow>
              <h3 className="text-xl font-bold group-hover:text-brand-600">{r.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-brand-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16 sm:px-6">
          <div>
            <h2 className="text-4xl font-extrabold text-white">Rejoignez PRIDe !</h2>
            <p className="mt-2 text-lg text-brand-100">Apprenez. Partagez. Grandissez. Et aidez les autres à grandir avec vous.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/adhesion" variant="white">Déposer ma candidature</ButtonLink>
            <ButtonLink href="/contact" className="bg-transparent ring-[1.5px] ring-inset ring-white hover:bg-white/10">Soutenir l'association</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
