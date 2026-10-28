# Contexte du projet PRIDe (pour Claude Code)

Application de l'association **PRIDe** (Partage Responsabilité Intégrité pour le Développement), Antananarivo, Madagascar.
L'équipe de développement est composée de bénévoles. Parlez en **français**, avec des explications simples.

## Sources de vérité métier
- Statuts et règlement intérieur adoptés par l'AG du **27 septembre 2026**. Les règles codées sont dans `packages/shared/src/constants.ts` et `rules.ts`, avec les tests dans `rules.test.ts`.
- Cotisations : actif 5 000 Ar d'entrée + 10 000 Ar/mois ; mineur 5 000 + 5 000 ; bienfaiteur 20 000 + 60 000.
- Agrément d'un membre : majorité des membres du CA **présents**. Exclusion : 2/3 des présents, après que le membre a pu se défendre.
- Mineurs : un parent ou tuteur doit être membre ; pas de vote à l'AG.
- Sections régionales : 90 % des cotisations pour la section, 10 % pour l'association.
- Journal comptable **non modifiable** (statuts, art. 21) : un trigger PostgreSQL l'impose (migration `0001`). On corrige par une écriture de rectification.
- Aide de solidarité : 50 000 Ar au membre, 25 000 Ar à la famille proche.
- Numéro de membre : `PRIDE` + année + mois d'entrée + rang dans le mois sur 4 chiffres (ex. `PRIDE2026100001`) ; le compteur repart chaque mois (`memberNumber` dans `rules.ts`).
- Conseil d'administration : Président ANDRIAMALALATOVONIAINA Ernest, Vice-président RANDRIAMANALINA Jean Alfred, 5 conseillers.
- Bureau exécutif : Coordonnateur ANDRIANADISON Lanto Tsiafindrahasina Nantenaina ; Secrétaire générale Manovosoa Nandrianiana (selon le PV ; la présentation indique « Manou Davide Kens », à confirmer) ; **poste de Trésorier vacant**.
- Contact : association4pride@gmail.com · 032 67 288 62 · siège CLT Tsiadana.

## Choix techniques (déjà validés avec l'équipe)
- Monorepo pnpm + Turborepo (`node-linker=hoisted` pour Expo).
- `apps/web` : Next.js 15, React **19.0.0** (aligné avec Expo, ne pas monter de version séparément), Tailwind 4, Server Actions, Better Auth.
- `apps/mobile` : Expo SDK 53, Expo Router, NativeWind 4 (Tailwind 3). React Navigation est figé via `pnpm.overrides` (versions de SDK 53).
- `packages/db` : **Drizzle ORM** (pas Prisma) + PostgreSQL 16. Les migrations se trouvent dans `packages/db/migrations`.
  - Nouvelle migration : `pnpm --filter @pride/db migrate:new`.
  - Appliquer les migrations : `pnpm db:deploy`.
- `packages/shared` : règles des statuts et schémas Zod, partagés entre le web, le mobile et le serveur.
- Fichiers : S3/MinIO, ou disque si `S3_ENDPOINT` est vide. E-mails : Nodemailer (Mailpit en local).
- Paiements : `PAYMENTS_MODE=simulation` par défaut. Les adaptateurs réels MVola / Orange / Airtel sont à brancher dans `apps/web/src/lib/payments.ts`.
- Les comptes membres sont créés **uniquement après l'agrément** : l'inscription libre est désactivée.
- Visibilité des actualités : `PUBLIC` (tout le monde) ou `MEMBRES`.

## Commandes
```bash
docker compose up -d && pnpm install && cp .env.example apps/web/.env.local
pnpm db:deploy && pnpm db:seed && pnpm dev          # démo : admin@pride.local / membre@pride.local / comptable@pride.local, mot de passe PrideDemo2026!
pnpm -r typecheck && pnpm --filter @pride/shared test
pnpm test:e2e                                        # site lancé, base fraîche + démo
node tests/commissions.e2e.mjs                       # site lancé, base avec démo (peut être relancé)
node tests/inscriptions.e2e.mjs                      # « Je participe » : site lancé, base avec démo (peut être relancé)
node tests/solidarite.e2e.mjs                        # aide de solidarité : site lancé, base avec démo (peut être relancé)
node tests/carte.e2e.mjs                             # carte de membre (QR + PDF) : site lancé, base avec démo
node tests/reseau.e2e.mjs                            # formations, offres, compétences, commissions : site lancé, base avec démo
node tests/messagerie.e2e.mjs                        # messagerie (assistant + responsables) : site lancé, base avec démo
node tests/consultation.e2e.mjs                      # consultation en ligne (vote anonyme) : site lancé, base avec démo
node tests/exclusion.e2e.mjs                         # exclusion / démission (≈ 2 min, crée des membres fictifs en base)
node tests/finances.e2e.mjs                          # espace Finances et comptable (crée des membres fictifs en base)
node tests/budget.e2e.mjs                            # budget : préparation, adoption, imputation (rectificatif de l'année en cours à chaque passage)
node tests/aide.e2e.mjs                              # aide : 3 guides, questions, accès, impression (site lancé, base avec démo)
node tests/captures-aide.mjs                         # régénère les captures des guides (site lancé, base avec démo)
# paiements, sur une base JETABLE migrée + démo (écrit au journal non modifiable) :
DATABASE_URL=…/pride_check pnpm --filter @pride/web exec tsx --conditions=react-server tests/paiements.check.mts
# BASE_URL=http://localhost:3001 pour un autre port ; CHROMIUM_PATH=… pour un Chromium déjà installé
```

## État d'avancement
- **Fait (phases 1-2)** :
  - site public ;
  - candidature avec pièces jointes ;
  - contact façon messagerie e-mail, envoyé à l'association ;
  - connexion ;
  - espace membres : carte, cotisations, paiement simulé + reçu + journal, actualités, inscriptions aux événements, profil ;
  - espace dirigeants : agrément CA, registre, publication des actualités ;
  - API REST `/api/v1` pour le mobile ;
  - application mobile : connexion, accueil, cotisations, actualités, profil ;
  - Docker, Caddy et CI GitHub.
- **Fait (phase 3)** :
  - commissions : responsables désignés pour 1 an par le CA, le Coordonnateur ou l'administrateur ; remplacement (le mandat précédent se termine la veille, ou est annulé s'il commençait le même jour), fin anticipée, composition des équipes, responsables affichés sur la page publique. Test : `node tests/commissions.e2e.mjs`.
  - inscription publique aux événements (« Je participe » : nom + téléphone, un numéro par événement, liste des inscrits dans Dirigeants › Actualités). Les événements « membres » restent absents de l'agenda public (choix validé). Test : `node tests/inscriptions.e2e.mjs`.
  - aide de solidarité : déclaration par le membre (tableau de bord), avec pièce jointe facultative (PDF ou image, jointe à l'e-mail et visible des dirigeants), e-mail à l'association, au Trésorier et au responsable de la Commission sociale, décision dans Dirigeants › Solidarité (CA, bureau, administrateur ; refus motivé), suivi par le membre. Une aide accordée reste « à verser » : elle est payée après le visa de sa pièce de dépense (Finances › Dépenses à viser). Test : `node tests/solidarite.e2e.mjs`.
  - carte de membre : photo ajoutée par le membre dans « Mon profil » (recadrée en 600 × 800 et sans métadonnées grâce à `sharp`), code QR sur le tableau de bord, PDF en portrait au format carte bancaire 54 × 85,6 mm (`/api/carte`, avec `pdf-lib` et `qrcode`, photo obligatoire), page publique `/verifier/<id du membre>` avec la photo, qui indique seulement si la carte est valide et si les cotisations sont à jour. Test : `node tests/carte.e2e.mjs`.
  - formations et offres, compétences et commissions (`apps/web/src/lib/network.ts`) :
    - formations = publications de type `FORMATION` (domaine, nombre de places ; inscription verrouillée pour ne jamais dépasser les places) ;
    - offres de stage, d'emploi ou de bénévolat proposées par tout membre, **publiées après validation** dans Dirigeants › Offres des membres ; « Je suis intéressé(e) » envoie les coordonnées à l'auteur, qui clôture son offre ;
    - annuaire des compétences : seulement les membres qui l'acceptent dans leur profil (`share_skills`, non par défaut) ; « Demander un coup de main » par e-mail ;
    - « Rejoindre » une commission = **demande** acceptée ou refusée sur la page de la commission (CA, Coordonnateur, administrateur) ;
    - propositions d'atelier et idées de projet : e-mail à l'association et au responsable de la Commission formation et projets, gardées dans `contact_messages` ;
    - bloc « Offres récentes » et « Prochaine formation » sur le tableau de bord. Test : `node tests/reseau.e2e.mjs`.
  - messagerie des membres (`apps/web/src/lib/messaging.ts`) : « Assistant PRIDe » par mots-clés (`assistantIntent` dans `rules.ts`, testé) qui répond avec les données du membre (cotisations dues, prochaine formation, AG convoquée, carte) ; « Parler à un responsable » transmet la dernière question au Trésorier, au Secrétariat général, au Coordonnateur ou à la Commission sociale ; réponses dans Dirigeants › Messagerie (tous les dirigeants, signées de leur nom) ; pièces jointes ; e-mails dans les deux sens ; pastilles « non lu ». Les échanges avec l'assistant ne sont pas visibles des dirigeants. Pas de temps réel : la page se met à jour à l'envoi ou au rechargement. Test : `node tests/messagerie.e2e.mjs`.
  - consultations en ligne (« vote en ligne » de la maquette, `apps/web/src/lib/consultations.ts`) : ouvertes par le CA, la Secrétaire générale ou l'administrateur sur la page AG (2 à 6 réponses, date de clôture) ; vote **anonyme** des membres actifs majeurs, une seule fois (`consultation_voters` et `consultation_ballots` sans lien entre eux) ; résultats après le vote ou la clôture ; carte « vote en ligne ouvert » sur le tableau de bord. **Avis consultatif** : les résolutions restent votées en séance d'AG (quorum des présents, pas de procuration). Test : `node tests/consultation.e2e.mjs`.
  - fin de la qualité de membre (`apps/web/src/lib/membership.ts`, fiche membre dans Dirigeants › Registre) : démission et décès enregistrés par le CA, la Secrétaire générale ou l'administrateur ; exclusion en deux étapes (motif et convocation du membre à une audition, puis délibération du CA **après l'audition**, adoptée aux 2/3 des présents avec `exclusionAdopted`). Effets : statut, fin des mandats, sortie des commissions, carte « non valide », espace membre et API fermés. Pas sur sa propre fiche. Test : `node tests/exclusion.e2e.mjs`.
  - aide (`/aide`) : guides des **candidats**, des **membres** et des **dirigeants** (ce dernier réservé aux dirigeants connectés), une page par tâche, version complète à imprimer `/aide/<guide>/imprimer` (une partie par feuille A4), et **questions fréquentes** `/aide/questions`. **Textes dans `apps/web/src/content/`** (`guide-*.ts`, `faq.ts`, registre `guides.ts`) à modifier sans toucher aux pages ; captures dans `apps/web/public/aide/<guide>`, régénérées par `tests/captures-aide.mjs` sur les données de démo (le seed crée aussi une candidature, une demande de solidarité et une conversation fictives pour ces captures).
  - espace **Finances** (`/finances`, `apps/web/src/lib/finances.ts`) et rôle **Comptable** (mandat `COMPTABLE`, attribué ou retiré par le CA ou l'administrateur sur la fiche du membre) : tableau de bord (solde, recettes et dépenses du mois, cotisations du mois, retards, aides à verser), journal (saisie de **recettes** seulement, **rectification par écriture inverse**, jamais de modification), encaissement des cotisations en espèces (reçu + recette), paiements et retards, export CSV pour l'AG. **Livre comptable** (`/finances/livre`, `ledgerBook`) : les écritures du journal regroupées par compte avec leurs totaux ; comptes dans `LEDGER_ACCOUNTS` (`constants.ts`, liste proposée à valider avec le comptable ; colonne texte `account`, on peut ajouter un compte sans migration mais pas renommer une clé utilisée). Compte choisi à la saisie d'une recette ou d'une pièce de dépense ; automatique pour les cotisations et les aides ; une rectification reprend le compte de l'écriture rectifiée. Les écritures antérieures (migration `0013`) restent « Non classé », sauf les cotisations. Enregistrent : comptable, Trésorier, administrateur ; les autres dirigeants consultent (lecture seule) ; le comptable n'a accès qu'à cet espace et y arrive à la connexion (`/connexion/suite`). Test : `node tests/finances.e2e.mjs`.
  - **budget annuel** (`apps/web/src/lib/budget.ts`, `/finances/budget`, `/membre/budget` pour les responsables de commission ; tables `budgets`, `budget_lines`) : un brouillon par année, lignes = compte du livre + commission ou « Général » + montant prévu (une ligne par compte et par commission) ; lignes générales par le comptable, le Trésorier, le Coordonnateur ou l'administrateur, lignes d'une commission aussi par ses responsables ; **adoption par le CA** (date de la réunion), puis verrouillé ; modification = **budget rectificatif** (version suivante, reprend les lignes, l'ancienne passe « Remplacé »). Chaque pièce de dépense est **imputée** à une ligne du budget adopté de l'année (ou « hors budget ») ; dépassement = **avertissement**, pas blocage. Suivi : prévu, réalisé (journal, net des rectifications), engagé (pièces en cours), reste ; export CSV. Une écriture porte une **commission** (`ledger_entries.commission_id`, facultative) : choisie à la saisie d'une recette (ex. participations des non-membres à une formation, argent remis par la commission au comptable), reprise de la ligne budgétaire pour une dépense payée, reprise par la rectification. Test : `node tests/budget.e2e.mjs`.
  - **visa des dépenses** (statuts, art. 22 ; table `expenses`, page `/finances/depenses`) : toute dépense passe par une pièce `PJ-0001` préparée (comptable, Trésorier, administrateur ; pour une aide accordée : « Préparer la pièce »), **signée par le Trésorier**, **visée par un membre du CA autre que le signataire**, puis payée (écriture de dépense au journal ; aide « Versée » et membre prévenu). Rejet motivé possible avant le visa. Tant que le poste de Trésorier est vacant, l'administrateur peut signer à sa place. E-mail à chaque étape (`notifyNextStep`) : à signer → Trésorier ; à viser → CA (sans le signataire) ; à payer → comptable et Trésorier ; sans destinataire → administrateur, puis boîte de l'association ; rejet → auteur de la pièce. Testé dans `node tests/finances.e2e.mjs`.
- **À faire (phase 3, voir la maquette validée)** :
  - AG et PV : convocation, quorum de la majorité absolue, votes, PV généré ;
  - sections régionales ;
  - envoi groupé SMS / e-mail ;
  - délégation au Coordonnateur (art. 17) ;
  - rappels de cotisation (pg-boss) ;
  - PDF des reçus ;
  - connexion par téléphone et code SMS ;
  - double authentification pour les dirigeants ;
  - version malgache.
- **Non testé dans l'environnement d'origine** :
  - la construction des images Docker (Docker Hub y était inaccessible) ;
  - l'application mobile sur un vrai téléphone.

## Conventions
- Texte de l'interface en français. Champs obligatoires marqués d'un `*` rouge, avec la mention « champ obligatoire ».
- Données de démonstration toujours signalées comme fictives.
- Toute action d'un dirigeant est tracée dans la table `audit_logs`.
