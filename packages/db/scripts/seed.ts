/**
 * Données initiales : commissions, conseil d'administration et bureau exécutif élus le 27 septembre 2026,
 * premiers articles. Avec SEED_DEMO=1 (par défaut hors production), ajoute deux comptes de démonstration.
 *
 *   pnpm db:seed
 */
import { hashPassword } from "better-auth/crypto";
import { COMMISSIONS, memberCounterPeriod, memberNumber, periodsBetween, TARIFS } from "@pride/shared";
import { and, eq } from "drizzle-orm";
import { closeDb, db, nextCounter } from "../src/index";
import * as s from "../src/schema";

const DEMO = (process.env.SEED_DEMO ?? (process.env.NODE_ENV === "production" ? "0" : "1")) === "1";
const AG_DATE = new Date("2026-09-27");
const plusYears = (d: Date, n: number) => new Date(d.getFullYear() + n, d.getMonth(), d.getDate());

async function upsertMember(input: { lastName: string; firstNames: string; isFounder?: boolean; email?: string; phone?: string; address?: string; joinedAt?: Date }) {
  const existing = await db.query.members.findFirst({
    where: and(eq(s.members.lastName, input.lastName), eq(s.members.firstNames, input.firstNames)),
  });
  if (existing) return existing;
  const joined = input.joinedAt ?? new Date();
  const number = memberNumber(joined, await nextCounter(`member-${memberCounterPeriod(joined)}`));
  const [m] = await db
    .insert(s.members)
    .values({ number, category: "ACTIF", isFounder: input.isFounder ?? false, ...input })
    .returning();
  return m!;
}

async function addMandate(memberId: string, role: (typeof s.mandateRole.enumValues)[number], startsAt: Date, endsAt: Date | null) {
  const exists = await db.query.mandates.findFirst({ where: and(eq(s.mandates.memberId, memberId), eq(s.mandates.role, role)) });
  if (!exists) await db.insert(s.mandates).values({ memberId, role, startsAt, endsAt });
}

async function createLogin(memberId: string, name: string, email: string, password: string) {
  const found = await db.query.user.findFirst({ where: eq(s.user.email, email) });
  if (found) return;
  const userId = crypto.randomUUID();
  await db.insert(s.user).values({ id: userId, name, email, emailVerified: true });
  await db.insert(s.account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(password),
  });
  await db.update(s.members).set({ userId, email }).where(eq(s.members.id, memberId));
}

async function main() {
  console.log("Commissions…");
  for (const c of COMMISSIONS) {
    await db.insert(s.commissions).values(c).onConflictDoNothing({ target: s.commissions.slug });
  }

  console.log("Conseil d'administration et bureau exécutif (AG du 27 septembre 2026)…");
  const ca: [string, string, (typeof s.mandateRole.enumValues)[number]][] = [
    ["ANDRIAMALALATOVONIAINA", "Ernest", "PRESIDENT"],
    ["RANDRIAMANALINA", "Jean Alfred", "VICE_PRESIDENT"],
    ["ARITIANA", "Lalaina", "CONSEILLER"],
    ["RAZAFINDRAKETAKA", "Ihary Hanta Clemence", "CONSEILLER"],
    ["RAKOTOARINORO FENOHARIMBOLA SITRAKA", "Elysée", "CONSEILLER"],
    ["ANDRIAMILISON", "Joëlle Sarobidy", "CONSEILLER"],
    ["RAZAFINDRAIBE", "Onja Jean Pascal", "CONSEILLER"],
  ];
  for (const [lastName, firstNames, role] of ca) {
    const m = await upsertMember({ lastName, firstNames, isFounder: true, joinedAt: new Date("2019-02-17") });
    await addMandate(m.id, role, AG_DATE, plusYears(AG_DATE, 5)); // mandat de 5 ans (art. 11)
  }
  const bureau: [string, string, (typeof s.mandateRole.enumValues)[number]][] = [
    ["ANDRIANADISON", "Lanto Tsiafindrahasina Nantenaina", "COORDONNATEUR"],
    ["Manovosoa", "Nandrianiana", "SECRETAIRE_GENERALE"],
    // Trésorier : poste à pourvoir (procès-verbal du 27 septembre 2026)
  ];
  for (const [lastName, firstNames, role] of bureau) {
    const m = await upsertMember({ lastName, firstNames, joinedAt: new Date("2019-02-17") });
    await addMandate(m.id, role, AG_DATE, plusYears(AG_DATE, 1)); // mandat d'un an (art. 16)
  }

  console.log("Articles…");
  const articles: (typeof s.posts.$inferInsert)[] = [
    {
      slug: "nouveau-conseil-administration-2026",
      type: "ARTICLE",
      title: "Un nouveau conseil d'administration élu",
      excerpt: "L'Assemblée générale du 27 septembre 2026 a élu les sept membres du conseil d'administration pour cinq ans.",
      body: "Le conseil a élu en son sein ANDRIAMALALATOVONIAINA Ernest comme Président et RANDRIAMANALINA Jean Alfred comme Vice-président.\n\nIl a également élu le bureau exécutif, dirigé par le Coordonnateur ANDRIANADISON Lanto Tsiafindrahasina Nantenaina.",
      imageUrl: "/images/realisations/vie-equipe.jpg",
      visibility: "PUBLIC",
      publishedAt: AG_DATE,
    },
    {
      slug: "statuts-reglement-2026",
      type: "ARTICLE",
      title: "Statuts et règlement intérieur mis à jour",
      excerpt: "L'Assemblée générale a adopté les modifications des statuts et du règlement intérieur.",
      body: "Parmi les nouveautés : les mineurs peuvent adhérer avec l'accord d'un parent ou tuteur membre, des sections régionales peuvent être créées à Madagascar, et des partenariats sont possibles avec des associations à l'étranger.\n\nLes règles de tenue de la comptabilité, sur papier ou par logiciel, ont aussi été précisées.",
      visibility: "PUBLIC",
      publishedAt: AG_DATE,
    },
    {
      slug: "conference-orientation",
      type: "ARTICLE",
      title: "Aider les jeunes à construire leur avenir",
      excerpt: "PRIDe a organisé une conférence d'orientation scolaire, professionnelle, entrepreneuriale et universitaire.",
      body: "Les intervenants ont détaillé l'orientation après le baccalauréat à Madagascar : parcours, établissements et débouchés.\n\nLa conférence s'est prolongée par des échanges directs pour conseiller chaque participant.",
      imageUrl: "/images/realisations/conf-universitaire.jpg",
      visibility: "PUBLIC",
      publishedAt: new Date("2025-06-01"),
    },
    {
      slug: "akany-avoko-charbon-vert",
      type: "ARTICLE",
      title: "Akany Avoko : soutien et formation au charbon vert",
      excerpt: "Avec l'ACAT Madagascar, PRIDe a rendu visite aux enfants et aux jeunes du centre Akany Avoko, à Ambohidratrimo.",
      body: "PRIDe y a porté un projet de formation à la fabrication de charbon écologique, une compétence pratique qui protège aussi l'environnement.\n\nL'action a été relayée par la presse nationale.",
      imageUrl: "/images/realisations/akany-presse.jpg",
      visibility: "PUBLIC",
      publishedAt: new Date("2024-12-20"),
    },
    {
      slug: "week-end-action-climat-2019",
      type: "ARTICLE",
      title: "PRIDe au Week-end Action Climat",
      excerpt: "Marche pour le climat, nettoyage des rues, éco-jogging et débats à Antananarivo.",
      body: "Partenaire de la mobilisation aux côtés de l'association JEUNE et d'autres organisations de jeunesse, PRIDe a mobilisé ses membres pour ramasser les déchets dans les rues de la capitale.",
      imageUrl: "/images/realisations/climat-marche.jpg",
      visibility: "PUBLIC",
      publishedAt: new Date("2019-01-26"),
    },
  ];
  for (const p of articles) await db.insert(s.posts).values(p).onConflictDoNothing({ target: s.posts.slug });

  if (DEMO) {
    console.log("Comptes de démonstration (SEED_DEMO=1)…");
    const admin = await upsertMember({ lastName: "Démo", firstNames: "Administrateur", joinedAt: new Date("2026-01-01") });
    await addMandate(admin.id, "ADMIN_TECHNIQUE", new Date("2026-01-01"), null);
    await createLogin(admin.id, "Administrateur Démo", "admin@pride.local", "PrideDemo2026!");

    const fanja = await upsertMember({ lastName: "RASOANAIVO", firstNames: "Fanja (démo)", phone: "034 12 345 67", address: "Analamahitsy, Antananarivo (fictif)", joinedAt: new Date("2026-03-01") });
    await createLogin(fanja.id, "Fanja (démo)", "membre@pride.local", "PrideDemo2026!");
    // Cotisations de mars à septembre payées, octobre à payer
    const now = new Date();
    for (const period of periodsBetween(new Date("2026-03-01"), now)) {
      const paid = period < "2026-10";
      await db
        .insert(s.dues)
        .values({ memberId: fanja.id, kind: "COTISATION", period, amount: TARIFS.ACTIF.cotisationMensuelle, status: paid ? "PAYEE" : "A_PAYER", paidAt: paid ? new Date(`${period}-05`) : null })
        .onConflictDoNothing();
    }
    await db
      .insert(s.posts)
      .values([
        {
          slug: "exemple-formation-ia",
          type: "FORMATION",
          title: "Intelligence artificielle : les bases (exemple)",
          excerpt: "Formation réservée aux membres. Date donnée à titre d'exemple.",
          body: "Comprendre et utiliser les outils d'IA pour gagner en efficacité.",
          visibility: "MEMBRES",
          eventAt: new Date(now.getFullYear(), now.getMonth() + 1, 7, 9),
          location: "CLT Tsiadana, Antananarivo",
          domain: "Intelligence artificielle",
          capacity: 20,
        },
        {
          slug: "exemple-formation-excel",
          type: "FORMATION",
          title: "Excel : tableaux et budget personnel (exemple)",
          excerpt: "Apportez votre ordinateur si possible. Date donnée à titre d'exemple.",
          body: "Construire un tableau de budget personnel pas à pas.",
          visibility: "MEMBRES",
          eventAt: new Date(now.getFullYear(), now.getMonth() + 1, 14, 14),
          location: "CLT Tsiadana, Antananarivo",
          domain: "Bureautique",
          capacity: 12,
        },
      ])
      .onConflictDoNothing({ target: s.posts.slug });

    // Annuaire des compétences : l'administrateur de démo y figure (avec son accord fictif).
    await db.update(s.members).set({ profession: "Développeur web (fictif)", skills: ["Sites web", "Excel"], shareSkills: true }).where(eq(s.members.id, admin.id));

    // Offres publiées et consultation ouverte, une seule fois même si le seed est relancé
    if (!(await db.query.offers.findFirst({ where: eq(s.offers.authorId, admin.id) }))) {
      await db.insert(s.offers).values([
        { authorId: admin.id, type: "STAGE", title: "Stage assistant comptable (exemple fictif)", description: "3 mois · niveau Licence en gestion.", location: "Antananarivo", status: "PUBLIEE" },
        { authorId: admin.id, type: "BENEVOLAT", title: "Animateur(trice) de formation bureautique (exemple fictif)", description: "2 samedis par mois.", location: "CLT Tsiadana", status: "PUBLIEE" },
      ]);
    }
    if (!(await db.query.consultations.findFirst())) {
      await db.insert(s.consultations).values({
        question: "Quel thème de formation prioritaire pour 2027 ? (exemple)",
        options: ["Intelligence artificielle", "Entrepreneuriat et création d'activité", "Langues (anglais, français)", "Leadership et art oratoire"],
        closesAt: new Date(now.getTime() + 21 * 86_400_000),
        createdBy: admin.id,
      });
    }
    console.log("  admin@pride.local / PrideDemo2026!   (espace dirigeants)");
    console.log("  membre@pride.local / PrideDemo2026!  (espace membres)");
  }

  console.log("Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);
