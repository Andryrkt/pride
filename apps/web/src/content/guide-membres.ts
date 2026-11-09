/**
 * Guide d'utilisation des membres (pages /aide).
 * Pour modifier le guide : changer les textes ci-dessous, sans toucher aux pages.
 * Les captures d'écran (dossier public/aide/membres) se régénèrent avec : node tests/captures-aide.mjs
 */
import type { GuidePage } from "./guides";

export const GUIDE_MEMBRES: GuidePage[] = [
  {
    slug: "connexion",
    title: "Se connecter et choisir son mot de passe",
    summary: "Votre compte est créé par l'association après l'agrément du conseil d'administration.",
    steps: [
      { text: "Après l'agrément, vous recevez un e-mail « PRIDe : choisissez votre mot de passe ». Ouvrez le lien qu'il contient (il est valable 72 heures)." },
      { text: "Choisissez un mot de passe d'au moins 10 caractères, puis validez." },
      { text: "Pour vous connecter ensuite, cliquez sur « Espace membres » en haut du site, entrez votre e-mail et votre mot de passe, puis « Se connecter ».", image: "connexion-1.png" },
      { text: "Mot de passe oublié ? Sur la page de connexion, cliquez sur « Mot de passe oublié ? », entrez votre e-mail : vous recevez un nouveau lien." },
    ],
    tips: [
      "Il n'est pas possible de créer un compte soi-même : il faut d'abord déposer sa candidature dans « Devenir membre ».",
      "Vous n'avez pas donné d'e-mail lors de votre candidature ? Contactez le Secrétariat général pour qu'il ajoute votre adresse.",
      "Sur un ordinateur partagé, décochez « Rester connecté » et pensez à cliquer sur « Déconnexion ».",
    ],
  },
  {
    slug: "cotisations",
    title: "Payer sa cotisation et retrouver ses reçus",
    summary: "Vous envoyez l'argent au numéro de l'association, vous déclarez votre paiement, et le reçu est créé après vérification.",
    steps: [
      { text: "Dans le menu, ouvrez « Mes cotisations ». Vous voyez ce que vous avez payé cette année et ce qui reste à payer.", image: "cotisations-1.png" },
      { text: "Dans « Payer par mobile money », cochez les mois que vous voulez régler (tous sont cochés au départ)." },
      { text: "Choisissez votre opérateur. La page affiche le montant, le numéro de l'association et le nom du titulaire." },
      { text: "Sur votre téléphone, envoyez l'argent par votre menu habituel, en vérifiant le nom avant de valider. L'association doit recevoir le montant exact : les frais d'envoi sont à votre charge." },
      { text: "Revenez sur la page : indiquez le numéro utilisé et la référence reçue par SMS, ajoutez une capture si vous le souhaitez, puis cliquez sur « J'ai envoyé… : déclarer »." },
      { text: "Vos mois passent « En vérification ». Dès que l'association a vérifié la réception de l'argent, vous recevez votre reçu dans « Paiements et reçus », en bas de la page. En cas de refus, le motif y est indiqué." },
    ],
    tips: [
      "Tarifs : membre actif 5 000 Ar d'entrée puis 10 000 Ar par mois ; membre mineur 5 000 Ar puis 5 000 Ar ; membre bienfaiteur 20 000 Ar puis 60 000 Ar.",
      "PRIDe ne vous demande jamais votre code secret mobile money.",
      "Vous préférez les espèces ? Remettez-les au comptable ou au Trésorier : le reçu est créé tout de suite.",
      "La cotisation versée reste acquise à l'association (règlement intérieur, art. 2).",
    ],
    links: [{ label: "Mes cotisations", href: "/membre/cotisations" }],
  },
  {
    slug: "carte",
    title: "Ajouter sa photo et télécharger sa carte de membre",
    summary: "Votre carte, avec photo et code QR, se télécharge en PDF et s'imprime au format d'une carte bancaire.",
    steps: [
      { text: "Dans « Mon profil », bloc « Photo de ma carte de membre », cliquez sur « Choisir un fichier » et prenez une photo d'identité récente, de face (JPG, PNG ou WEBP, 5 Mo maximum).", image: "carte-1.png" },
      { text: "Cliquez sur « Enregistrer la photo ». Elle est recadrée automatiquement au format d'une photo d'identité." },
      { text: "Revenez au « Tableau de bord » : votre carte affiche la photo et un code QR. Sous « Télécharger ma carte », choisissez « PDF » pour l'imprimer, ou « Image » pour la garder sur votre téléphone ou la partager.", image: "carte-2.png" },
      { text: "Imprimez le PDF à taille réelle (100 %, sans « ajuster à la page ») : la carte mesure 54 × 85,6 mm." },
    ],
    tips: [
      "Le code QR permet à un responsable de vérifier, en le scannant avec un téléphone, que votre carte est valide.",
      "La carte n'est plus valide si l'on n'est plus membre (démission, exclusion) : le scan l'indique aussitôt.",
      "Pour votre vie privée, la position GPS et les autres informations cachées de la photo sont supprimées à l'envoi.",
    ],
    links: [{ label: "Mon profil", href: "/membre/profil" }],
  },
  {
    slug: "profil",
    title: "Mettre à jour son profil et ses compétences",
    summary: "Téléphone, quartier, profession et compétences : gardez-les à jour pour être joignable et trouver de l'aide.",
    steps: [
      { text: "Ouvrez « Mon profil ». Modifiez votre téléphone, votre quartier ou ville, votre profession ou vos études.", image: "profil-1.png" },
      { text: "Dans « Compétences partagées », écrivez ce que vous savez faire, séparé par des virgules. Ex. : Excel, anglais, couture." },
      { text: "Cochez « Apparaître dans l'annuaire des compétences » si vous acceptez que les autres membres vous trouvent et vous demandent un coup de main." },
      { text: "Cliquez sur « Enregistrer »." },
    ],
    tips: [
      "Dans l'annuaire, les membres voient votre prénom, l'initiale de votre nom, votre profession et vos compétences, jamais votre téléphone ni votre e-mail.",
      "Pour changer votre nom ou votre date de naissance, adressez-vous au Secrétariat général.",
    ],
    links: [{ label: "Mon profil", href: "/membre/profil" }],
  },
  {
    slug: "formations",
    title: "S'inscrire à une formation ou à un événement",
    summary: "Les formations sont animées par les membres eux-mêmes ; les places sont parfois limitées.",
    steps: [
      { text: "Dans le menu, ouvrez « Apprendre » : l'onglet « Formations et offres » s'affiche. Chaque formation indique sa date, son domaine et les places restantes.", image: "formations-1.png" },
      { text: "Cliquez sur « S'inscrire ». Le bouton devient « Inscrit(e) ✓ »." },
      { text: "Un empêchement ? Cliquez à nouveau sur « Inscrit(e) ✓ » pour libérer votre place." },
      { text: "Pour les autres événements, ouvrez « Actualités » et cliquez sur « Je m'inscris »." },
      { text: "Vous avez un savoir-faire à partager ? En bas de la page Formations, cliquez sur « Proposer un atelier »." },
    ],
    tips: ["Une formation « Complet » n'accepte plus d'inscription : surveillez la page, une place peut se libérer."],
    links: [{ label: "Formations et offres", href: "/membre/formations" }],
  },
  {
    slug: "offres",
    title: "Stages, emplois et bénévolat : répondre à une offre ou en publier une",
    summary: "Les membres partagent entre eux des offres de stage, d'emploi ou de bénévolat.",
    steps: [
      { text: "Ouvrez « Apprendre » (onglet « Formations et offres »), puis « Stages et emplois ».", image: "offres-1.png" },
      { text: "Une offre vous intéresse ? Cliquez sur « Je suis intéressé(e) » : votre nom, votre téléphone et votre e-mail sont transmis à la personne qui l'a publiée, qui vous contacte." },
      { text: "Pour publier une offre, cliquez sur « Publier une offre » en bas de la page : choisissez le type, l'intitulé, la description et le lieu, puis « Proposer l'offre »." },
      { text: "Votre offre est visible par les membres dès qu'un dirigeant l'a validée. Vous recevez un e-mail pour chaque membre intéressé." },
      { text: "Le poste est pourvu ? Cliquez sur « Clôturer l'offre »." },
    ],
    tips: ["Méfiez-vous d'une offre qui demande de l'argent aux candidats et signalez-la à un responsable par la messagerie."],
    links: [{ label: "Stages et emplois", href: "/membre/formations?vue=offres" }],
  },
  {
    slug: "commissions",
    title: "Rejoindre une commission, demander un coup de main, proposer un projet",
    summary: "Le trait d'union entre ceux qui veulent aider et ceux qui en ont besoin.",
    steps: [
      { text: "Ouvrez « Compétences et commissions ».", image: "commissions-1.png" },
      { text: "Annuaire : filtrez par compétence, puis cliquez sur « Demander un coup de main ». Le membre reçoit un e-mail avec vos coordonnées." },
      { text: "Commissions : cliquez sur « Rejoindre ». Votre demande est acceptée par le conseil d'administration ou le Coordonnateur ; vous voyez ensuite « Membre ✓ »." },
      { text: "Une idée de projet ? Remplissez « Proposer une idée de projet » en bas de la page : elle est transmise à la Commission formation et projets, puis au conseil d'administration." },
    ],
    links: [{ label: "Compétences et commissions", href: "/membre/competences" }],
  },
  {
    slug: "solidarite",
    title: "Demander l'aide de solidarité",
    summary: "Lors d'un événement heureux ou douloureux, l'association verse 50 000 Ar au membre et 25 000 Ar à sa famille proche.",
    steps: [
      { text: "Sur le « Tableau de bord », bloc « Solidarité », cliquez sur « Déclarer un événement ».", image: "solidarite-1.png" },
      { text: "Choisissez le type d'événement (mariage, naissance, maladie ou hospitalisation, décès), la personne concernée et la date." },
      { text: "Ajoutez si possible une pièce jointe (certificat, faire-part, acte) : cela accélère le traitement." },
      { text: "Cliquez sur « Envoyer la demande ». Elle part au Trésorier et à la Commission sociale." },
      { text: "Suivez votre demande dans le même bloc : « En attente », « Accordée, à verser » ou « Refusée ». La réponse arrive aussi par e-mail." },
    ],
    tips: ["En cas de décès, deux représentants de l'association assistent à l'enterrement, aux frais de l'association."],
    links: [{ label: "Tableau de bord", href: "/membre#solidarite" }],
  },
  {
    slug: "messagerie",
    title: "Poser une question : l'assistant et les responsables",
    summary: "L'assistant PRIDe répond tout de suite ; il peut aussi transmettre votre question à la bonne personne.",
    steps: [
      { text: "Ouvrez « Messagerie ». Cliquez sur un bouton (« Ma cotisation », « Prochaines formations »…) ou écrivez votre question, puis appuyez sur la flèche d'envoi.", image: "messagerie-1.png" },
      { text: "L'assistant répond avec vos informations à jour et un lien vers la bonne page." },
      { text: "Besoin d'une personne ? Cliquez sur « Parler à un responsable » et choisissez : Trésorier, Secrétariat général, Coordonnateur ou Commission sociale. Votre dernière question lui est transmise." },
      { text: "La réponse arrive dans la conversation et par e-mail. Une pastille rouge sur « Messagerie » signale un nouveau message." },
      { text: "Pour joindre un document (PDF ou photo, 5 Mo maximum), cliquez sur le trombone à gauche de la zone de saisie." },
    ],
    tips: ["Les responsables répondent en général sous 48 heures. Les échanges avec l'assistant restent privés."],
    links: [{ label: "Messagerie", href: "/membre/messages" }],
  },
  {
    slug: "autodiscipline",
    title: "Autodiscipline : objectifs, habitudes et bilans",
    summary: "Un espace personnel pour organiser son temps, tenir ses objectifs et prendre de bonnes habitudes.",
    steps: [
      { text: "Ouvrez « Apprendre », onglet « Mes pratiques », puis « Autodiscipline ». Ajoutez une habitude facile à tenir, par exemple « Lire 10 minutes ». Commencez par une seule : vous pourrez en suivre trois au maximum." },
      { text: "Chaque jour, cliquez sur « Fait aujourd'hui ». Si vous avez oublié de cocher la veille, cliquez sur « Fait hier aussi »." },
      { text: "Ajoutez vos objectifs, avec une date limite si vous le souhaitez, puis marquez-les « Atteint » ou « Abandonner »." },
      { text: "Faites votre bilan quand vous le voulez : choisissez « Aujourd'hui » ou « Cette semaine », répondez aux questions, puis enregistrez." },
    ],
    tips: [
      "Cet espace est affiché à vous seul : il ne figure dans aucune page des dirigeants et n'a aucun effet sur votre statut de membre.",
      "Rater un jour n'efface rien : recommencez simplement le lendemain.",
    ],
    links: [{ label: "Autodiscipline", href: "/membre/discipline" }],
  },
  {
    slug: "mon-budget",
    title: "Mon budget : suivre son argent et épargner",
    summary: "Une pratique d'intelligence financière : noter ses revenus et ses dépenses, voir où va l'argent, se fixer un objectif d'épargne.",
    steps: [
      { text: "Ouvrez « Apprendre », onglet « Mes pratiques », puis « Mon budget »." },
      { text: "Dans « Ajouter un revenu ou une dépense », choisissez la catégorie (salaire, alimentation, transport…), le montant en ariary et la date, ajoutez un libellé si vous le souhaitez, puis « Ajouter »." },
      { text: "En haut de la page : vos revenus, vos dépenses et ce qui reste (votre épargne du mois). « Où va mon argent ? » montre la part de chaque type de dépense." },
      { text: "Fixez une épargne visée par mois dans « Objectif d'épargne » : une barre montre où vous en êtes." },
      { text: "Une erreur ? Cliquez sur « Supprimer » à côté de la ligne. Les flèches « Mois précédent » et « Mois suivant » montrent les autres mois." },
    ],
    tips: [
      "Ce budget est affiché à vous seul : il ne figure dans aucune page des dirigeants et n'a aucun lien avec la comptabilité de l'association.",
      "Notez vos dépenses au fil des jours, même les petites (taxi-be, crédit téléphonique) : ce sont souvent elles qui font la différence.",
      "Mettez de côté au début du mois, pas à la fin : l'épargne devient une dépense prévue.",
    ],
    links: [{ label: "Mon budget", href: "/membre/mon-budget" }],
  },
  {
    slug: "ressources",
    title: "Ressources : textes, vidéos et fiches à télécharger",
    summary: "Une bibliothèque classée par thème (autodiscipline, intelligence financière, bureautique…), préparée par les membres.",
    steps: [
      { text: "Ouvrez « Apprendre », onglet « Ressources ». Choisissez un thème pour filtrer la liste." },
      { text: "Cliquez sur le titre d'une ressource pour lire son texte complet." },
      { text: "Une vidéo ? Cliquez sur « Lire la vidéo » : elle ne se charge qu'à ce moment-là." },
      { text: "Une fiche PDF ? Cliquez sur « Télécharger le PDF » pour la lire ou l'imprimer." },
    ],
    tips: [
      "Les vidéos consomment des données internet : regardez-les de préférence en Wi-Fi. Le texte et la fiche PDF reprennent l'essentiel.",
      "Certaines ressources sont aussi en vitrine sur le site public, page « Ressources », pour faire connaître l'association.",
    ],
    links: [{ label: "Ressources", href: "/membre/ressources" }],
  },
  {
    slug: "publier-ressource",
    title: "Publier, modifier ou retirer une ressource",
    summary: "Pour les responsables de la Commission formation et projets, la Secrétaire générale et l'administrateur.",
    steps: [
      { text: "Ouvrez « Apprendre », onglet « Ressources ». Le formulaire « Publier une ressource » est sous la liste (il n'apparaît que si vous pouvez publier)." },
      { text: "Choisissez le thème, puis remplissez le titre, un court résumé et le texte complet." },
      { text: "Vidéo : publiez-la d'abord sur YouTube (en « non répertoriée » si elle est réservée aux membres), puis collez son lien. Les autres sites ne sont pas acceptés." },
      { text: "Fiche PDF : ajoutez-la si vous le souhaitez (10 Mo maximum)." },
      { text: "La ressource est réservée aux membres. Cochez « Mettre en vitrine » pour la montrer aussi sur le site public. Cliquez sur « Publier la ressource »." },
      { text: "Pour la corriger, ouvrez-la et cliquez sur « Modifier » : vous pouvez tout changer, remplacer ou retirer la fiche PDF, ou la sortir de la vitrine." },
      { text: "« Retirer cette ressource » la range dans les archives : elle n'est plus visible, mais n'est jamais supprimée." },
    ],
    tips: ["Chaque publication, modification ou retrait est enregistré avec votre nom.", "Un texte court et clair, avec des exemples de la vie à Madagascar, est plus utile qu'un long document."],
    links: [{ label: "Ressources", href: "/membre/ressources" }],
  },
  {
    slug: "assemblee-generale",
    title: "Assemblée générale et consultations en ligne",
    summary: "L'AG est l'organe suprême de PRIDe ; les consultations recueillent l'avis des membres entre deux AG.",
    steps: [
      { text: "Ouvrez « Assemblée générale ». Vous y trouvez les convocations (date, lieu, ordre du jour, résolutions) et les procès-verbaux des AG passées.", image: "ag-1.png" },
      { text: "Le jour de l'AG, signez la liste d'émargement sur place : votre présence compte pour le quorum. Les procurations ne sont pas admises." },
      { text: "Consultation en ligne : choisissez une réponse, puis « Valider mon vote ». Le vote est anonyme et ne peut pas être modifié." },
      { text: "Après votre vote, vous voyez les résultats provisoires." },
    ],
    tips: [
      "Seuls les membres actifs majeurs votent ; les membres mineurs et bienfaiteurs peuvent assister aux AG.",
      "Les consultations donnent un avis : les décisions de l'association restent votées en AG, par les membres présents.",
      "La convocation est envoyée par e-mail au moins 15 jours avant l'AG.",
    ],
    links: [{ label: "Assemblée générale", href: "/membre/ag" }],
  },
];
