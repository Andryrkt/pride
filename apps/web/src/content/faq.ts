/** Foire aux questions (page /aide/questions). Ajouter ici les questions que les membres posent souvent. */
export type FaqItem = { q: string; a: string; link?: { label: string; href: string } };

export const FAQ: { theme: string; items: FaqItem[] }[] = [
  {
    theme: "Adhésion",
    items: [
      { q: "Comment devenir membre ?", a: "Déposez votre candidature en ligne dans « Devenir membre », avec les 4 pièces demandées. Vous devez être parrainé par un membre du conseil d'administration, ou passer un entretien avec deux de ses membres. Le conseil d'administration décide ensuite à la majorité de ses membres présents.", link: { label: "Guide des candidats", href: "/aide/candidats/candidature" } },
      { q: "Un mineur peut-il adhérer ?", a: "Oui, avec l'accord d'un parent ou tuteur qui est lui-même membre de l'association. La cotisation est de 5 000 Ar par mois. Les membres mineurs assistent aux assemblées générales mais ne votent pas." },
      { q: "Je ne peux pas créer de compte sur le site : est-ce normal ?", a: "Oui. Le compte est créé par l'association après l'agrément de votre candidature. Vous recevez alors un e-mail pour choisir votre mot de passe." },
      { q: "Je n'ai pas d'adresse e-mail. Puis-je être membre ?", a: "Oui. Vous ne pourrez pas utiliser l'espace membre en ligne, mais l'association vous contacte par téléphone. Vous pouvez demander à tout moment l'ajout d'un e-mail au Secrétariat général." },
    ],
  },
  {
    theme: "Connexion",
    items: [
      { q: "J'ai oublié mon mot de passe.", a: "Sur la page de connexion, cliquez sur « Mot de passe oublié ? » et entrez votre e-mail : vous recevez un lien pour en choisir un nouveau.", link: { label: "Se connecter", href: "/aide/membres/connexion" } },
      { q: "Le lien pour choisir mon mot de passe ne marche plus.", a: "Il est valable 72 heures. Demandez-en un nouveau avec « Mot de passe oublié ? » sur la page de connexion." },
      { q: "Je n'arrive plus à entrer dans l'espace membre.", a: "Vérifiez votre e-mail et votre mot de passe. Si un message indique que vous n'êtes plus membre actif (démission, exclusion), l'espace membre n'est plus accessible : contactez l'association." },
    ],
  },
  {
    theme: "Cotisations et paiements",
    items: [
      { q: "Combien coûte l'adhésion ?", a: "Membre actif : 5 000 Ar de droit d'entrée, puis 10 000 Ar par mois. Membre mineur : 5 000 Ar puis 5 000 Ar. Membre bienfaiteur : 20 000 Ar puis 60 000 Ar. Les montants peuvent être révisés chaque année par l'assemblée générale." },
      { q: "Comment payer ?", a: "Dans « Mes cotisations », par MVola, Orange Money ou Airtel Money : choisissez les mois, l'opérateur et le numéro, puis validez la demande sur votre téléphone.", link: { label: "Payer sa cotisation", href: "/aide/membres/cotisations" } },
      { q: "Où trouver mes reçus ?", a: "Dans « Mes cotisations », en bas de la page : « Paiements et reçus »." },
      { q: "Puis-je payer plusieurs mois en une fois ?", a: "Oui : cochez tous les mois à régler avant de cliquer sur « Payer »." },
      { q: "Puis-je être remboursé ?", a: "Non : la cotisation versée reste acquise à l'association (règlement intérieur, art. 2)." },
    ],
  },
  {
    theme: "Carte de membre",
    items: [
      { q: "Comment obtenir ma carte ?", a: "Ajoutez votre photo dans « Mon profil », puis cliquez sur « Télécharger ma carte » sur le tableau de bord. Imprimez le PDF à taille réelle (100 %).", link: { label: "Ma carte de membre", href: "/aide/membres/carte" } },
      { q: "À quoi sert le code QR ?", a: "En le scannant avec un téléphone, un responsable vérifie que la carte est valide et que son titulaire est bien membre actif." },
      { q: "Que veut dire mon numéro de membre ?", a: "PRIDE, puis l'année et le mois de votre entrée, puis votre rang d'arrivée dans le mois. Exemple : PRIDE2026100001 est le premier membre entré en octobre 2026." },
    ],
  },
  {
    theme: "Vie de l'association",
    items: [
      { q: "Comment rejoindre une commission ?", a: "Dans « Compétences et commissions », cliquez sur « Rejoindre ». Votre demande est acceptée par le conseil d'administration ou le Coordonnateur.", link: { label: "Rejoindre une commission", href: "/aide/membres/commissions" } },
      { q: "Qui a droit à l'aide de solidarité ?", a: "Tout membre actif, lors d'un événement heureux ou douloureux : 50 000 Ar pour le membre, 25 000 Ar pour sa famille proche. Déclarez l'événement depuis votre tableau de bord.", link: { label: "Aide de solidarité", href: "/aide/membres/solidarite" } },
      { q: "Qui vote à l'assemblée générale ?", a: "Les membres actifs majeurs présents. Les procurations ne sont pas admises. L'AG délibère si la majorité absolue des membres ayant droit de vote est présente ; sinon, une deuxième AG délibère quel que soit le nombre de présents." },
      { q: "Mon vote à une consultation en ligne est-il secret ?", a: "Oui. L'application enregistre que vous avez voté, mais pas ce que vous avez voté : les deux informations sont gardées séparément, sans lien entre elles." },
    ],
  },
  {
    theme: "Données personnelles",
    items: [
      { q: "Qui voit mes coordonnées ?", a: "Les dirigeants de l'association, pour la gestion des adhésions. Les autres membres ne voient jamais votre téléphone ni votre e-mail, sauf la personne que vous contactez vous-même (« Je suis intéressé(e) » sur une offre, « Demander un coup de main »). Dans l'annuaire des compétences, si vous l'acceptez, ils voient votre prénom, l'initiale de votre nom, votre profession et vos compétences." },
      { q: "Comment ne plus apparaître dans l'annuaire des compétences ?", a: "Dans « Mon profil », décochez « Apparaître dans l'annuaire des compétences », puis enregistrez." },
      { q: "Une autre question ?", a: "Posez-la à l'assistant de la messagerie, qui peut la transmettre à un responsable, ou écrivez à association4pride@gmail.com.", link: { label: "Formulaire de contact", href: "/contact" } },
    ],
  },
];
