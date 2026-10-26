/** Guide des candidats (pages /aide/candidats). Modifier les textes ici, sans toucher aux pages. */
import type { GuidePage } from "./guides";

export const GUIDE_CANDIDATS: GuidePage[] = [
  {
    slug: "candidature",
    title: "Déposer sa candidature en ligne",
    summary: "Toute personne, sans distinction de sexe ni d'âge, qui accepte les statuts peut adhérer.",
    steps: [
      { text: "Sur le site, cliquez sur « Devenir membre », puis sur « Déposer ma candidature ».", image: "candidature-1.png" },
      { text: "Remplissez la fiche : nom, prénoms, date de naissance, téléphone, quartier ou ville. L'e-mail est facultatif, mais il est nécessaire pour accéder ensuite à l'espace membre en ligne." },
      { text: "Choisissez la catégorie : membre actif (5 000 Ar d'entrée puis 10 000 Ar par mois) ou membre bienfaiteur (20 000 Ar puis 60 000 Ar). Le montant à payer après l'agrément s'affiche en bas du formulaire." },
      { text: "Parrainage : choisissez votre parrain parmi les membres du conseil d'administration, ou demandez un entretien avec deux de ses membres." },
      { text: "Joignez les 4 pièces (PDF ou photo, 5 Mo maximum chacune) : certificat de résidence, photocopie légalisée de la CIN, curriculum vitae, lettre de motivation. Le compteur indique « 4 / 4 pièces jointes » quand tout y est.", image: "candidature-2.png" },
      { text: "Cochez l'accord pour l'utilisation de vos données, puis cliquez sur « Envoyer ma candidature ». Notez la référence affichée (par exemple C-2026-0018)." },
    ],
    tips: [
      "Candidat mineur : le formulaire le repère à la date de naissance. Il demande alors le nom et le numéro de membre du parent ou tuteur, qui doit être membre, et l'acte de naissance au lieu de la CIN. La cotisation est de 5 000 Ar par mois.",
      "Un champ est marqué en rouge ? Corrigez-le : les autres informations sont gardées. Seules les pièces jointes sont à choisir de nouveau.",
      "Vos données servent uniquement à la gestion de votre adhésion (loi n° 2014-038 sur la protection des données personnelles).",
    ],
    links: [{ label: "Devenir membre", href: "/adhesion#candidature" }],
  },
  {
    slug: "apres-candidature",
    title: "Après la candidature : agrément, compte et premier paiement",
    summary: "Le conseil d'administration statue sur votre candidature, puis votre espace membre est ouvert.",
    steps: [
      { text: "Si vous avez donné un e-mail, vous recevez la confirmation « votre candidature est bien reçue » avec votre référence." },
      { text: "Si vous avez demandé un entretien, deux membres du conseil d'administration vous contactent pour fixer la date." },
      { text: "Le conseil d'administration vote : l'agrément demande la majorité de ses membres présents. Vous recevez la réponse par e-mail." },
      { text: "Après l'agrément, l'association crée votre fiche de membre et votre numéro (par exemple PRIDE2026100001). Vous recevez l'e-mail « choisissez votre mot de passe » : suivez le guide des membres, page « Se connecter »." },
      { text: "Dans votre espace, « Mes cotisations » : payez le droit d'entrée et la première cotisation par MVola, Orange Money ou Airtel Money." },
      { text: "Ajoutez votre photo dans « Mon profil » pour télécharger votre carte de membre." },
    ],
    tips: ["Pas d'e-mail ? L'association vous contacte par téléphone à chaque étape. Vous pouvez demander à tout moment l'ajout d'un e-mail pour accéder à l'espace membre."],
    links: [{ label: "Guide des membres", href: "/aide/membres" }],
  },
];
