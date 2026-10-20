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
pnpm db:deploy && pnpm db:seed && pnpm dev          # démo : admin@pride.local / membre@pride.local, mot de passe PrideDemo2026!
pnpm -r typecheck && pnpm --filter @pride/shared test
pnpm test:e2e                                        # site lancé, base fraîche + démo
node tests/commissions.e2e.mjs                       # site lancé, base avec démo (peut être relancé)
node tests/inscriptions.e2e.mjs                      # « Je participe » : site lancé, base avec démo (peut être relancé)
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
- **À faire (phase 3, voir la maquette validée)** :
  - AG et PV : convocation, quorum de la majorité absolue, votes, PV généré ;
  - sections régionales ;
  - envoi groupé SMS / e-mail ;
  - visa des dépenses (signature du Trésorier + visa du CA) ;
  - délégation au Coordonnateur (art. 17) ;
  - assistant de messagerie membres (chatbot par mots-clés avec passage à un responsable) ;
  - rappels de cotisation (pg-boss) ;
  - PDF des reçus et des cartes ;
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
