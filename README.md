# PRIDe : site web et application mobile

Application de l'association **PRIDe — Partage Responsabilité Intégrité pour le Développement** (Antananarivo, Madagascar).

Elle comprend trois espaces :

- **Public** : présentation, réalisations, actualités, candidature en ligne avec pièces jointes, contact par e-mail.
- **Membres** : carte de membre, cotisations et paiement mobile money, actualités (y compris réservées aux membres), profil.
- **Dirigeants** : agrément des candidatures par le conseil d'administration, registre des membres, publication des actualités.

Une **application mobile** (Android et iOS) donne accès à l'espace membres.

Les règles viennent des **statuts et du règlement intérieur adoptés le 27 septembre 2026** : tarifs, agrément à la majorité des présents, mineurs, journal comptable non modifiable, etc. Elles sont regroupées dans `packages/shared/src`.

---

## Technologies

| Rôle | Outil |
|---|---|
| Monorepo | pnpm + Turborepo |
| Site web | Next.js 15 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4 |
| Application mobile | Expo SDK 53 (React Native), Expo Router, NativeWind |
| Base de données | PostgreSQL 16 + **Drizzle ORM** (migrations SQL versionnées) |
| Authentification | Better Auth (web et mobile, sessions sécurisées) |
| Validation | Zod (mêmes règles pour le web, le mobile et le serveur) |
| Fichiers | MinIO en local, tout service compatible S3 en production (ou le disque) |
| E-mails | Nodemailer, avec Mailpit en local |
| Paiements | Adaptateurs MVola / Orange Money / Airtel Money (mode **simulation** par défaut) |
| Déploiement | Docker, Docker Compose, Caddy (HTTPS automatique) |
| Qualité | Vitest (règles des statuts), test de bout en bout Playwright, GitHub Actions |

> **Pourquoi Drizzle plutôt que Prisma ?** Drizzle est 100 % TypeScript : il n'y a aucun moteur à télécharger, ce qui simplifie Docker et les serveurs. Le schéma est dans `packages/db/src/schema.ts`.

---

## Démarrer en local

Prérequis : **Node.js 22**, **pnpm 10** (`corepack enable`), **Docker Desktop**.

```bash
# 1. Dépendances
pnpm install

# 2. Services : PostgreSQL, MinIO (fichiers), Mailpit (e-mails de test)
docker compose up -d

# 3. Configuration
cp .env.example apps/web/.env.local     # puis changez BETTER_AUTH_SECRET (openssl rand -base64 32)

# 4. Base de données : tables + données initiales (CA, bureau, commissions, articles, comptes de démo)
pnpm db:deploy
pnpm db:seed

# 5. Site web
pnpm dev                                 # http://localhost:3000
```

Adresses utiles en local :

- Site : http://localhost:3000
- E-mails envoyés (Mailpit) : http://localhost:8025
- Fichiers (console MinIO) : http://localhost:9001 (identifiant `pride`, mot de passe `pride-secret`)

**Comptes de démonstration** (créés par `pnpm db:seed` hors production) :

| Compte | Mot de passe | Accès |
|---|---|---|
| `admin@pride.local` | `PrideDemo2026!` | Espace dirigeants et espace membres |
| `membre@pride.local` | `PrideDemo2026!` | Espace membres |

> En production, `SEED_DEMO=0` : seuls le conseil d'administration, le bureau, les commissions et les articles sont créés.

### Application mobile

```bash
# Adresse IP de votre ordinateur sur le Wi-Fi (le téléphone doit être sur le même réseau)
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 pnpm dev:mobile
```

Scannez ensuite le QR code avec l'application **Expo Go**. Pour publier sur le Play Store ou l'App Store, utilisez EAS Build (`npx eas build`).

---

## Organisation du code

```
apps/
  web/            Site Next.js : pages publiques, espaces membres et dirigeants, API REST /api/v1 pour le mobile
  mobile/         Application Expo : connexion, carte, cotisations, actualités, profil
packages/
  db/             Schéma Drizzle, migrations SQL, scripts de migration et de données initiales
  shared/         Règles des statuts (tarifs, majorités, quorum…), schémas de validation Zod, tests
docker/           Entrypoint de l'image et configuration Caddy
tests/            Parcours de bout en bout (Playwright)
```

Les fichiers les plus importants :

- `packages/shared/src/constants.ts` et `rules.ts` : les règles des statuts, à mettre à jour si l'AG révise les montants.
- `packages/db/src/schema.ts` : toutes les tables.
- `apps/web/src/lib/applications.ts` : circuit d'adhésion, de la candidature jusqu'à la fiche membre.
- `apps/web/src/lib/dues.ts` et `payments.ts` : cotisations, paiements, reçus, journal comptable.
- `apps/web/src/lib/session.ts` : qui a le droit de faire quoi.

---

## Circuits métier

**Adhésion** (règlement intérieur, art. 1)

1. Candidature en ligne (fiche + 4 pièces). L'association et le candidat reçoivent un e-mail.
2. Parrainage par un membre du CA, ou entretien planifié avec 2 membres du CA.
3. Délibération du CA, enregistrée par un dirigeant : nombre de présents, voix pour et voix contre. La candidature est agréée si les voix pour dépassent la moitié des présents.
4. Création de la fiche membre (numéro `PR-AAAA-NNNN`), du droit d'entrée et de la première cotisation. Si le membre a un e-mail, il reçoit un lien pour choisir son mot de passe.

**Cotisations et paiements**

- Les cotisations mensuelles sont créées automatiquement, à partir de `DUES_START_PERIOD` (par défaut `2026-10`).
- Le paiement par mobile money se fait depuis le site ou l'application. Il génère un reçu `R-AAAA-NNNN` et une écriture au journal comptable.
- **Journal comptable** : une règle (un *trigger*) PostgreSQL interdit de modifier ou de supprimer une écriture (statuts, art. 21).

**Actualités** : chaque contenu est publié avec la visibilité « Tout le monde » (site public et espace membres) ou « Membres seulement ».

---

## Brancher les vrais paiements mobile money

En mode `PAYMENTS_MODE=simulation`, tous les paiements réussissent immédiatement. Pour passer en réel :

1. Obtenir les comptes marchands (MVola de Telma, Orange Money, Airtel Money) et leurs identifiants d'API.
2. Implémenter `initiate()` pour chaque opérateur dans `apps/web/src/lib/payments.ts`.
3. Faire appeler `/api/paiements/notification/[operateur]` par l'opérateur. Cette route est protégée par l'en-tête `x-pride-secret` = `PAYMENTS_WEBHOOK_SECRET` ; adaptez le format du corps à celui de chaque opérateur.
4. Mettre `PAYMENTS_MODE=reel`.

---

## Mise en production

Sur un serveur (VPS) avec Docker, et un nom de domaine qui pointe vers ce serveur :

```bash
cp .env.example .env          # renseignez DOMAIN, POSTGRES_PASSWORD, BETTER_AUTH_SECRET, S3_*, SMTP_*, NEXT_PUBLIC_APP_URL=https://votre-domaine
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web node migrator/seed.mjs   # une seule fois (SEED_DEMO=0 par défaut en production)
```

Au démarrage, l'image applique automatiquement les migrations. Caddy obtient le certificat HTTPS.

**Sauvegardes** : les statuts demandent une sauvegarde mensuelle. Planifiez par exemple `pg_dump` et une copie du volume MinIO (`minio-data`).

---

## Tests

```bash
pnpm --filter @pride/shared test   # règles des statuts (majorités, quorum, sections 90/10, validation…)
pnpm -r typecheck                  # vérification des types de tous les paquets

# Parcours de bout en bout (base fraîche + démo, site lancé avec « pnpm build && pnpm --filter @pride/web start »)
pnpm exec playwright install chromium
pnpm test:e2e
```

Le parcours de bout en bout vérifie :

- la candidature avec ses pièces jointes ;
- le formulaire de contact ;
- l'agrément par le CA et la création du membre ;
- le paiement et le reçu ;
- la visibilité « membres seulement » ;
- les interdictions d'accès (espace dirigeants, pièces jointes, API sans connexion).

Le test des commissions (`node tests/commissions.e2e.mjs`, base avec démo, peut être relancé) vérifie :

- la désignation d'un responsable pour un an, et le refus d'une double désignation ;
- le remplacement du responsable, qui clôt ou annule le mandat précédent ;
- l'ajout et le retrait de membres ;
- l'affichage du responsable sur la page publique et la fin de mandat anticipée ;
- l'interdiction d'accès pour un membre simple.

---

## Prochaines étapes (phase 3)

- Pages de la maquette restant à développer :
  - AG et procès-verbaux : convocations, quorum, votes, génération du PV ;
  - sections régionales : répartition 90/10 ;
  - envoi groupé de SMS et d'e-mails ;
  - délégation de pouvoirs.
- Assistant de messagerie dans l'espace membres.
- Rappels automatiques de cotisation (tâches planifiées avec pg-boss).
- Reçus et cartes de membre en PDF (@react-pdf/renderer).
- Connexion par téléphone et code SMS (plugin Better Auth) pour les membres sans e-mail.
- Double authentification obligatoire pour les dirigeants.
- Version malgache du site (next-intl).


Comptes de démonstration (fictifs), mot de passe PrideDemo2026! :

espace membres : membre@pride.local ;
espace dirigeants : admin@pride.local.

Ce que j'ai fait : j'ai lancé le serveur de développement en arrière-plan avec npx next dev --turbopack -p 3001 dans apps/web.
