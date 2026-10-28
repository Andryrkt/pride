// Espace Finances et rôle de comptable : arrivée du comptable sur ses finances, accès limité, écriture, rectification
// (journal non modifiable), encaissement en espèces, versement d'une aide, export CSV, désignation du comptable.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration, dont comptable@pride.local) et l'application lancée.
// Crée à chaque passage des membres fictifs directement en base. Peut être relancé.
//   node tests/finances.e2e.mjs
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36).toUpperCase();

async function login(email, landing) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}${landing}`);
  return page;
}
const fictive = async (suffix) =>
  (await db.query(`insert into members (number, last_name, first_names, joined_at) values ($1, $2, 'Test (fictif)', now()) returning id`, [`TEST${run}${suffix}`, `FINANCES-${suffix}-${run}`])).rows[0].id;

try {
  await db.connect();
  const cashMember = await fictive("A");
  const aidMember = await fictive("B");
  const futureComptable = await fictive("C");
  const { rows: [aid] } = await db.query(
    `insert into solidarity_requests (member_id, kind, concerns, event_date, amount, status, decided_at) values ($1, 'NAISSANCE', 'MEMBRE', now(), 50000, 'ACCORDEE', now()) returning id`,
    [aidMember],
  );

  // 1. Le comptable arrive directement sur ses finances et n'a pas accès au reste de l'espace dirigeants
  const comptable = await login("comptable@pride.local", "/finances");
  if (await comptable.getByRole("link", { name: "Agrément des adhésions" }).count()) fail("le comptable voit le menu des dirigeants");
  await comptable.goto(`${BASE}/dirigeants/membres`);
  if (comptable.url().includes("/dirigeants")) fail("le comptable accède au registre des membres");
  log("comptable : arrivée sur Finances, espace dirigeants refusé");

  // 2. Écriture, puis rectification ; le journal refuse toute modification directe
  const LABEL = `Location de salle test ${run} (fictif)`;
  await comptable.goto(`${BASE}/finances/journal`);
  const form = comptable.locator("form", { has: comptable.getByRole("button", { name: "Enregistrer l'écriture" }) });
  await form.getByLabel("Recette ou dépense").selectOption("DEPENSE");
  await form.getByLabel("Libellé").fill(LABEL);
  await form.getByLabel("Montant (Ar)").fill("85000");
  await form.getByLabel("N° de pièce").fill(`PJ-${run}`);
  await form.getByRole("button", { name: "Enregistrer l'écriture" }).click();
  await form.getByText(/Écriture n° \d+ enregistrée/).waitFor();
  const row = comptable.locator("tr", { hasText: LABEL });
  await row.getByText("Validée · verrouillée").waitFor();
  await row.getByText("Rectifier").click();
  await row.getByLabel("Motif").fill("montant erroné (test)");
  await row.getByRole("button", { name: "Enregistrer la rectification" }).click();
  await comptable.locator("tr", { hasText: "Rectification de l'écriture" }).filter({ hasText: "montant erroné (test)" }).first().waitFor();
  await comptable.locator("tr", { hasText: LABEL }).getByText("Rectifiée").waitFor();
  const blocked = await db.query("update ledger_entries set amount = 1 where label = $1", [LABEL]).then(() => false, () => true);
  if (!blocked) fail("une écriture validée a pu être modifiée");
  log("écriture, rectification par écriture inverse, modification directe refusée par la base");

  // 3. Espèces : la cotisation du mois est payée, avec reçu et recette au journal
  await comptable.goto(`${BASE}/finances/encaisser?membre=${cashMember}`);
  await comptable.getByRole("button", { name: "Enregistrer le paiement en espèces" }).click();
  await comptable.getByText(/reçu n° R-\d{4}-\d{4}/).waitFor();
  const { rows: dues } = await db.query("select status from dues where member_id = $1", [cashMember]);
  if (!dues.length || dues.some((d) => d.status !== "PAYEE")) fail("échéances non payées après l'encaissement");
  const { rows: cash } = await db.query("select 1 from ledger_entries l join payments p on p.id = l.payment_id where p.member_id = $1 and l.label like '%via espèces'", [cashMember]);
  if (!cash.length) fail("recette en espèces absente du journal");
  log("espèces : échéance payée, reçu, recette au journal");

  // 4. Versement d'une aide de solidarité accordée
  await comptable.goto(`${BASE}/finances`);
  const aidCard = comptable.locator("div.rounded-xl", { hasText: `FINANCES-B-${run}` });
  await aidCard.getByRole("button", { name: "Enregistrer le versement" }).click();
  await comptable.getByText("Aide versée").waitFor();
  const { rows: [paid] } = await db.query("select status, paid_at from solidarity_requests where id = $1", [aid.id]);
  if (paid.status !== "VERSEE" || !paid.paid_at) fail("aide non marquée versée");
  log("aide de solidarité versée : dépense au journal, statut « Versée »");

  // 5. Export CSV pour l'AG
  await comptable.goto(`${BASE}/finances/journal`);
  const [download] = await Promise.all([comptable.waitForEvent("download"), comptable.getByRole("link", { name: "Exporter pour l'AG (CSV)" }).click()]);
  const csv = await readFile(await download.path(), "utf8");
  if (!csv.includes(LABEL) || !csv.includes("Totaux")) fail("export CSV incomplet");
  log("export CSV :", download.suggestedFilename());

  // 6. Un simple membre n'a pas accès aux finances
  const member = await login("membre@pride.local", "/membre");
  await member.goto(`${BASE}/finances`);
  if (member.url().includes("/finances")) fail("un simple membre accède aux finances");
  log("simple membre : finances refusées");

  // 7. Désignation et retrait du comptable par l'administrateur
  const admin = await login("admin@pride.local", "/membre");
  await admin.goto(`${BASE}/dirigeants/membres/${futureComptable}`);
  await admin.getByRole("button", { name: "Désigner comme comptable" }).click();
  await admin.getByText("Rôle de comptable attribué").waitFor();
  await admin.getByRole("button", { name: "Retirer le rôle de comptable" }).click();
  await admin.getByText("Rôle de comptable retiré").waitFor();
  const { rows: m } = await db.query("select ends_at from mandates where member_id = $1 and role = 'COMPTABLE'", [futureComptable]);
  if (m.length !== 1 || !m[0].ends_at) fail("mandat de comptable non terminé");
  log("administrateur : désignation puis retrait du rôle de comptable");

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
  await browser.close();
}
