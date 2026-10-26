/** Guide des dirigeants (pages /aide/dirigeants, réservées aux dirigeants). Modifier les textes ici, sans toucher aux pages. */
import type { GuidePage } from "./guides";

export const GUIDE_DIRIGEANTS: GuidePage[] = [
  {
    slug: "espace-dirigeants",
    title: "L'espace dirigeants : qui peut faire quoi",
    summary: "Les membres du conseil d'administration, du bureau exécutif et l'administrateur du site y accèdent depuis leur espace membre.",
    steps: [
      { text: "Connectez-vous comme membre, puis cliquez sur « Espace dirigeants » dans le menu.", image: "espace-1.png" },
      { text: "Le tableau de bord montre les membres actifs, les candidatures en cours, les cotisations du mois et les membres en retard." },
      { text: "Les pastilles rouges du menu signalent ce qui attend une action : candidatures, demandes de commission, aides de solidarité, offres, messages." },
      { text: "Agrément des adhésions, registre (démission, exclusion), AG et consultations : conseil d'administration, Secrétaire générale et administrateur." },
      { text: "Commissions (responsables, composition, demandes d'entrée) : conseil d'administration, Coordonnateur et administrateur." },
      { text: "Aides de solidarité : conseil d'administration, bureau exécutif et administrateur. Offres des membres, messagerie, publications : tous les dirigeants." },
    ],
    tips: [
      "Chaque action d'un dirigeant est enregistrée dans le journal de l'application (qui, quoi, quand).",
      "Un mandat terminé retire l'accès à l'espace dirigeants le lendemain de sa date de fin.",
    ],
    links: [{ label: "Espace dirigeants", href: "/dirigeants" }],
  },
  {
    slug: "adhesions",
    title: "Agréer une candidature et créer la fiche membre",
    summary: "Règlement intérieur, art. 1 : agrément par le conseil d'administration à la majorité de ses membres présents.",
    steps: [
      { text: "Ouvrez « Agrément des adhésions », puis la candidature. Vérifiez la fiche de renseignement et ouvrez chaque pièce jointe.", image: "adhesions-1.png" },
      { text: "Candidat sans parrain : renseignez « Date de l'entretien (2 membres du CA) » et cliquez sur « Planifier l'entretien »." },
      { text: "Parrainage vérifié ou entretien fait : cliquez sur « Soumettre au vote du CA »." },
      { text: "Après la réunion du CA, saisissez la date, les membres présents, les voix pour et contre, puis « Enregistrer la décision ». L'agrément demande la majorité des présents ; le candidat est prévenu par e-mail." },
      { text: "Candidature agréée : cliquez sur « Créer la fiche membre ». Le numéro est attribué, le droit d'entrée et la première cotisation sont à payer, et le candidat reçoit le lien pour choisir son mot de passe." },
    ],
    tips: [
      "Candidat mineur : vérifiez que le parent ou tuteur indiqué est bien membre (numéro de membre) et qu'il donne son accord.",
      "Un candidat sans e-mail n'a pas d'accès en ligne : prévenez-le par téléphone.",
    ],
    links: [{ label: "Agrément des adhésions", href: "/dirigeants/adhesions" }],
  },
  {
    slug: "registre",
    title: "Le registre : démission, décès, exclusion",
    summary: "Règlement intérieur, art. 2 : l'exclusion est votée aux deux tiers des membres du CA présents, après que le membre a pu se défendre.",
    steps: [
      { text: "Ouvrez « Registre des membres ». Recherchez par nom ou numéro, filtrez par catégorie, puis cliquez sur le nom pour ouvrir la fiche.", image: "registre-1.png" },
      { text: "Démission (sur lettre du membre) ou décès : dans « Démission ou décès », saisissez la date et une note, puis enregistrez." },
      { text: "Exclusion, étape 1 : « Ouvrir une procédure d'exclusion ». Écrivez le motif et la date de l'audition. Le membre reçoit le motif et la convocation par e-mail ; sans e-mail, remettez-les-lui par écrit." },
      { text: "Exclusion, étape 2, après l'heure de l'audition : saisissez la délibération du CA (date, présents, voix pour et contre, résumé de la défense) et confirmez que le membre a pu se défendre. L'exclusion n'est prononcée qu'avec les deux tiers des présents (par exemple 4 voix sur 6)." },
    ],
    tips: [
      "Dans tous les cas, la carte devient « non valide », les mandats et les commissions prennent fin, et l'espace membre est fermé.",
      "Personne ne peut enregistrer un départ ou une exclusion sur sa propre fiche.",
    ],
    links: [{ label: "Registre des membres", href: "/dirigeants/membres" }],
  },
  {
    slug: "assemblee-generale",
    title: "Préparer et tenir une assemblée générale",
    summary: "Statuts, art. 18 : convocation 15 jours avant, quorum de la majorité absolue des membres ayant droit de vote, pas de procuration.",
    steps: [
      { text: "« Assemblées générales » › « Préparer une AG » : type, intitulé, date et heure, lieu, ordre du jour, puis « Créer l'AG ».", image: "ag-1.png" },
      { text: "Dans l'AG, « Ajouter une résolution » pour chaque point à voter : intitulé, texte soumis au vote, majorité requise." },
      { text: "Au moins 15 jours avant : « Envoyer la convocation ». Elle part par e-mail aux membres actifs et apparaît dans leur espace. Prévenez par téléphone ceux qui n'ont pas d'e-mail (leur nombre s'affiche)." },
      { text: "Le jour de l'AG : choisissez le président et le secrétaire de séance, puis « Ouvrir la séance ». Le nombre de votants et le quorum sont alors figés." },
      { text: "Émargement : sélectionnez chaque membre présent et cliquez sur « Émarger ». Le droit de vote est vérifié automatiquement (membres actifs majeurs)." },
      { text: "Quorum atteint : pour chaque résolution, saisissez les voix pour, contre et les abstentions, puis « Enregistrer le vote »." },
      { text: "Fin de séance : « Clôturer et établir le PV ». Le procès-verbal se consulte et s'imprime depuis le bouton « Procès-verbal » ; il n'est plus modifiable." },
    ],
    tips: [
      "Quorum non atteint sur première convocation : « Constater la carence », puis « Préparer la deuxième AG », qui délibère quel que soit le nombre de présents.",
      "Une erreur de saisie dans un vote se corrige avec « Corriger le vote » tant que la séance n'est pas clôturée.",
    ],
    links: [{ label: "Assemblées générales", href: "/dirigeants/ag" }],
  },
  {
    slug: "consultations",
    title: "Ouvrir une consultation en ligne",
    summary: "Recueillir l'avis des membres entre deux AG : vote anonyme, un vote par membre actif majeur.",
    steps: [
      { text: "En bas de la page « Assemblées générales », bloc « Ouvrir une consultation ».", image: "consultations-1.png" },
      { text: "Écrivez la question, puis les réponses possibles, une par ligne (de 2 à 6), et la date de clôture." },
      { text: "Cliquez sur « Ouvrir la consultation ». Les membres la voient sur leur tableau de bord (« vote en ligne ouvert »)." },
      { text: "Suivez les résultats en direct sur la même page." },
    ],
    tips: ["Une consultation donne un avis : les décisions de l'association restent votées en AG, par les membres présents."],
    links: [{ label: "Assemblées générales", href: "/dirigeants/ag" }],
  },
  {
    slug: "publications",
    title: "Publier une actualité, un événement ou une formation",
    summary: "Publiez une seule fois : vous choisissez qui peut voir le contenu.",
    steps: [
      { text: "Ouvrez « Actualités et événements ». Choisissez le type : article, événement, formation ou annonce.", image: "publier-1.png" },
      { text: "Écrivez le titre et le texte (le premier paragraphe sert de résumé). Pour un événement ou une formation, ajoutez la date, l'heure et le lieu." },
      { text: "Formation : indiquez le domaine et, si besoin, le nombre de places. Les inscriptions s'arrêtent quand c'est complet." },
      { text: "Choisissez « Tout le monde » (site public) ou « Membres seulement », puis « Publier »." },
      { text: "La liste des inscrits aux événements et formations à venir est en bas de la page, avec les téléphones des visiteurs inscrits depuis le site." },
    ],
    tips: ["Les événements « Membres seulement » n'apparaissent jamais sur le site public."],
    links: [{ label: "Actualités et événements", href: "/dirigeants/actualites" }],
  },
  {
    slug: "commissions",
    title: "Commissions : responsables, équipes, demandes",
    summary: "Les responsables de commission sont désignés pour un an par le CA, le Coordonnateur ou l'administrateur.",
    steps: [
      { text: "Ouvrez « Commissions », puis la commission.", image: "commissions-1.png" },
      { text: "Responsable : choisissez le membre et la date de début, puis « Désigner ». Le mandat dure un an ; le précédent se termine la veille." },
      { text: "« Mettre fin au mandat » arrête un mandat avant son terme." },
      { text: "Équipe : « Ajouter un membre » ou « Retirer »." },
      { text: "Demandes pour rejoindre la commission (envoyées par les membres) : « Accepter » ou « Refuser ». Le membre est prévenu par e-mail." },
    ],
    links: [{ label: "Commissions", href: "/dirigeants/commissions" }],
  },
  {
    slug: "demandes-membres",
    title: "Traiter les demandes : solidarité et offres",
    summary: "Les demandes des membres arrivent par e-mail et dans l'espace dirigeants, avec une pastille dans le menu.",
    steps: [
      { text: "« Solidarité » : lisez la demande et ouvrez la pièce jointe. « Accorder » (message facultatif) ou « Refuser » (motif obligatoire, envoyé au membre).", image: "solidarite-1.png" },
      { text: "Une aide accordée reste « à verser » : le versement passe par une pièce de dépense signée du Trésorier et visée par le CA (statuts, art. 22)." },
      { text: "« Offres des membres » : vérifiez chaque offre de stage, d'emploi ou de bénévolat avant de la publier : pas d'arnaque, pas de frais demandés aux candidats. « Publier » ou « Refuser » avec un motif." },
      { text: "Une offre pourvue peut être clôturée par son auteur ou par un dirigeant (« Clôturer »)." },
    ],
    links: [
      { label: "Solidarité", href: "/dirigeants/solidarite" },
      { label: "Offres des membres", href: "/dirigeants/offres" },
    ],
  },
  {
    slug: "messagerie",
    title: "Répondre aux messages des membres",
    summary: "L'assistant de la messagerie transmet aux responsables les questions qu'il ne peut pas traiter.",
    steps: [
      { text: "Ouvrez « Messagerie ». À gauche, les conversations transmises, avec le destinataire choisi par le membre (Trésorier, Secrétariat général, Coordonnateur, Commission sociale).", image: "messagerie-1.png" },
      { text: "Ouvrez une conversation : le téléphone et l'e-mail du membre sont en haut." },
      { text: "Écrivez la réponse (avec une pièce jointe si besoin) et envoyez. Elle est signée de votre nom, et le membre la reçoit aussi par e-mail." },
    ],
    tips: [
      "Les échanges entre un membre et l'assistant automatique restent privés : seules les conversations transmises apparaissent ici.",
      "Essayez de répondre sous 48 heures : c'est le délai annoncé aux membres.",
    ],
    links: [{ label: "Messagerie", href: "/dirigeants/messages" }],
  },
];
