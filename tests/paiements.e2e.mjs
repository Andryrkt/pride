// Paiement mobile money déclaré : numéros officiels (droits, trace), déclaration par le membre, référence unique, vérification
// (confirmation avec reçu et journal, refus motivé), accès à la capture, interdiction de vérifier son propre paiement.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Écrit au journal non modifiable. Peut être relancé.
//   node tests/paiements.e2e.mjs
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36).toUpperCase();
const REF_OK = `OK${run}`;
const REF_KO = `KO${run}`;
// Échéances fictives à des années éloignées : elles ne se mélangent pas aux vraies.
const year = 3000 + (Date.now() % 5000);
const LABEL_OK = `Cotisation janvier ${year}`;
const LABEL_KO = `Cotisation février ${year}`;
let selfPayment;
const tempMandates = [];
let savedAirtel;

async function login(email, landing) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}${landing}`);
  return page;
}
const memberOf = async (email) => (await db.query(`select m.id from members m join "user" u on u.id = m.user_id where u.email = $1`, [email])).rows[0].id;

async function declare(page, label, reference, proof) {
  await page.goto(`${BASE}/membre/cotisations`);
  for (const row of await page.locator('label:has(input[name="due"])').all()) {
    await row.locator("input").setChecked((await row.innerText()).includes(label));
  }
  await page.getByLabel("MVola").check();
  await page.getByLabel("Numéro utilisé pour l'envoi").fill("034 12 345 67");
  await page.getByLabel("Référence de la transaction").fill(reference);
  if (proof) await page.locator('input[name="proof"]').setInputFiles(proof);
  await page.getByRole("button", { name: /: déclarer$/ }).click();
}

try {
  await db.connect();
  await db.query(`insert into payment_accounts (provider, number, holder) values ('MVOLA', '034 00 000 00', 'PRIDe (numéro fictif de démonstration)') on conflict do nothing`);
  savedAirtel = (await db.query(`select * from payment_accounts where provider = 'AIRTEL_MONEY'`)).rows[0];
  await db.query(`delete from payment_accounts where provider = 'AIRTEL_MONEY'`);
  const memberId = await memberOf("membre@pride.local");
  await db.query(`insert into dues (member_id, kind, period, amount) values ($1, 'COTISATION', $2, 10000), ($1, 'COTISATION', $3, 10000)`, [memberId, `${year}-01`, `${year}-02`]);

  // 1. Numéros officiels : ni le comptable ni l'administrateur ne les changent, le CA si ; un opérateur sans numéro n'est pas proposé
  const comptable = await login("comptable@pride.local", "/finances");
  await comptable.goto(`${BASE}/finances/numeros`);
  await comptable.getByText("Seuls le Trésorier").waitFor();
  if (await comptable.locator("#number-MVOLA").count()) fail("le comptable peut modifier les numéros");
  log("comptable : numéros en lecture seule");

  const member = await login("membre@pride.local", "/membre");
  await member.goto(`${BASE}/membre/cotisations`);
  if (await member.getByLabel("Airtel Money").count()) fail("opérateur sans numéro proposé");
  await member.goto(`${BASE}/finances/numeros`);
  if (member.url().includes("/finances")) fail("un membre accède aux numéros");
  log("membre : opérateur sans numéro absent, page des numéros refusée");

  const admin = await login("admin@pride.local", "/membre");
  await admin.goto(`${BASE}/finances/numeros`);
  await admin.getByText("Seuls le Trésorier").waitFor();
  if (await admin.locator("#number-MVOLA").count()) fail("l'administrateur peut modifier les numéros");
  log("administrateur : numéros en lecture seule");

  const ca = await login("ca@pride.local", "/membre");
  await ca.goto(`${BASE}/finances/numeros`);
  await ca.fill("#number-AIRTEL_MONEY", "12345");
  await ca.fill("#holder-AIRTEL_MONEY", "PRIDe (fictif)");
  await ca.locator("form", { has: ca.locator("#number-AIRTEL_MONEY") }).getByRole("button", { name: "Enregistrer" }).click();
  await ca.getByText("Numéro de téléphone malgache invalide").first().waitFor();
  await ca.fill("#number-AIRTEL_MONEY", "033 00 000 00");
  await ca.locator("form", { has: ca.locator("#number-AIRTEL_MONEY") }).getByRole("button", { name: "Enregistrer" }).click();
  await ca.getByText("Numéro Airtel Money enregistré").waitFor();
  const { rows: traced } = await db.query(`select 1 from audit_logs where action = 'finances.numero_modifie' and target = 'AIRTEL_MONEY' and created_at > now() - interval '5 minutes'`);
  if (!traced.length) fail("changement de numéro non tracé");
  await member.goto(`${BASE}/membre/cotisations`);
  await member.getByLabel("Airtel Money").check();
  await member.getByText("033 00 000 00").waitFor();
  await ca.getByRole("button", { name: "Retirer ce numéro" }).first().waitFor();
  await ca.locator(".grid > *", { has: ca.locator("#number-AIRTEL_MONEY") }).getByRole("button", { name: "Retirer ce numéro" }).click();
  await ca.getByText("Numéro Airtel Money retiré").waitFor();
  log("CA : numéro refusé s'il est invalide, ajouté, tracé, proposé au membre, puis retiré");

  // 2. Déclaration : ni reçu ni journal avant la vérification ; une référence ne sert qu'une fois
  await declare(member, LABEL_OK, REF_OK.toLowerCase());
  await member.getByText("Déclaration enregistrée").waitFor();
  await member.locator("div", { hasText: LABEL_OK }).getByText("En vérification").first().waitFor();
  const { rows: [paid] } = await db.query(`select id, status, receipt_number from payments where provider_ref = $1`, [REF_OK]);
  if (!paid || paid.status !== "EN_ATTENTE" || paid.receipt_number) fail("paiement déclaré mal enregistré");
  if ((await db.query("select 1 from ledger_entries where payment_id = $1", [paid.id])).rows.length) fail("écriture au journal avant vérification");
  log("déclaration : en attente, référence en majuscules, sans reçu ni journal");

  await declare(member, LABEL_KO, REF_OK);
  await member.getByText("Cette référence a déjà été déclarée").waitFor();
  log("référence déjà utilisée : refusée");

  const png = { name: "capture.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") };
  await declare(member, LABEL_KO, REF_KO, png);
  await member.getByText("Déclaration enregistrée").waitFor();
  const { rows: [refused] } = await db.query(`select id from payments where provider_ref = $1`, [REF_KO]);

  // 3. Capture : ni un autre membre sans droit, ni un visiteur
  if ((await fetch(`${BASE}/api/paiements/${refused.id}/preuve`)).status !== 403) fail("capture accessible sans compte");
  const secretaire = await login("secretaire@pride.local", "/membre");
  if ((await secretaire.request.get(`${BASE}/api/paiements/${refused.id}/preuve`)).status() !== 403) fail("capture accessible à un dirigeant qui ne vérifie pas");
  if ((await member.request.get(`${BASE}/api/paiements/${refused.id}/preuve`)).status() !== 200) fail("capture inaccessible à son auteur");
  if ((await comptable.request.get(`${BASE}/api/paiements/${refused.id}/preuve`)).status() !== 200) fail("capture inaccessible au comptable");
  log("capture : auteur et comptable seulement");

  // 4. Vérification : confirmation (reçu, journal), refus motivé (échéance à nouveau payable)
  await admin.goto(`${BASE}/finances/verifier`);
  await admin.getByText(REF_OK).waitFor();
  if (await admin.getByRole("button", { name: "Argent reçu : confirmer" }).count()) fail("l'administrateur peut confirmer un paiement");
  if ((await admin.request.get(`${BASE}/api/paiements/${refused.id}/preuve`)).status() !== 403) fail("capture accessible à l'administrateur");
  const card = (ref) => comptable.locator("section, article, div", { hasText: ref }).filter({ has: comptable.getByRole("button", { name: "Argent reçu : confirmer" }) }).last();
  await comptable.goto(`${BASE}/finances/verifier`);
  await card(REF_OK).getByRole("button", { name: "Argent reçu : confirmer" }).click();
  await comptable.getByText(/Paiement confirmé : reçu n° R-\d{4}-\d{4}/).waitFor();
  const { rows: ledger } = await db.query("select label from ledger_entries where payment_id = $1", [paid.id]);
  if (ledger.length !== 1 || !ledger[0].label.includes(REF_OK)) fail("recette absente du journal après confirmation");
  log("confirmation : reçu et recette au journal, avec la référence");

  const cardKo = card(REF_KO);
  await cardKo.getByText("Refuser ce paiement").click();
  await cardKo.getByLabel("Motif du refus").fill(`Référence introuvable ${run}`);
  await cardKo.getByRole("button", { name: "Refuser le paiement" }).click();
  await comptable.getByText("Paiement refusé : le membre est prévenu.").waitFor();
  const { rows: [back] } = await db.query("select status, payment_id from dues where member_id = $1 and period = $2", [memberId, `${year}-02`]);
  if (back.status !== "A_PAYER" || back.payment_id) fail("échéance non libérée après refus");
  if ((await db.query("select 1 from ledger_entries where payment_id = $1", [refused.id])).rows.length) fail("écriture au journal après refus");
  log("refus : échéance à nouveau payable, rien au journal");

  await member.goto(`${BASE}/membre/cotisations`);
  await member.getByText(new RegExp(`R-\\d{4}-\\d{4}`)).first().waitFor();
  await member.getByText(`Référence introuvable ${run}`).waitFor();
  log("membre : voit son reçu et le motif du refus");

  // 5. Personne ne vérifie son propre paiement
  const own = await memberOf("comptable@pride.local");
  selfPayment = (await db.query(`insert into payments (member_id, amount, provider, provider_ref) values ($1, 1000, 'MVOLA', $2) returning id`, [own, `SELF${run}`])).rows[0].id;
  await comptable.goto(`${BASE}/finances/verifier`);
  await comptable.getByText("C'est votre propre paiement").waitFor();
  log("son propre paiement : à vérifier par une autre personne");

  // 6. Poste de Trésorier vacant : le Coordonnateur le remplace, jusqu'à la désignation d'un Trésorier
  const mandate = async (id, role) => tempMandates.push((await db.query("insert into mandates (member_id, role, starts_at) values ($1, $2, current_date) returning id", [id, role])).rows[0].id);
  const { rows: treasurers } = await db.query("select 1 from mandates where role = 'TRESORIER' and starts_at <= current_date and (ends_at is null or ends_at >= current_date)");
  if (treasurers.length) {
    log("remplacement non testé : un Trésorier est en fonction");
  } else {
    await mandate(memberId, "COORDONNATEUR");
    await member.goto(`${BASE}/finances/numeros`);
    await member.getByText("vous le remplacez temporairement").waitFor();
    await member.locator("#number-MVOLA").waitFor();
    await member.goto(`${BASE}/dirigeants`);
    await member.getByText("Trésorier par intérim").waitFor();
    await mandate(own, "TRESORIER");
    await member.goto(`${BASE}/finances/numeros`);
    await member.getByText("Seuls le Trésorier").waitFor();
    if (await member.getByText("vous le remplacez temporairement").count()) fail("le remplacement continue après la désignation");
    log("Coordonnateur : remplace le Trésorier vacant, droits retirés dès qu'un Trésorier est en fonction");
  }
} finally {
  if (db._connected) {
    if (selfPayment) await db.query("delete from payments where id = $1", [selfPayment]);
    for (const id of tempMandates) await db.query("delete from mandates where id = $1", [id]);
    // Échéances fictives de ce test (années éloignées : jamais de vraies cotisations) ; le journal et les paiements restent.
    await db.query(`delete from dues where period >= '3000'`);
    if (savedAirtel) await db.query(`insert into payment_accounts (provider, number, holder) values ('AIRTEL_MONEY', $1, $2) on conflict do nothing`, [savedAirtel.number, savedAirtel.holder]);
    await db.end();
  }
  await browser.close();
}
