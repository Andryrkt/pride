// Accès en ligne d'une fiche sans compte (ex. dirigeants créés par le script de départ) : l'administrateur indique l'e-mail,
// le membre choisit son mot de passe avec le lien reçu, se connecte et arrive dans l'espace dirigeants ; lien renvoyé.
// Prérequis : base avec « pnpm db:seed » et l'application lancée. Peut être relancé : la fiche du conseiller
// RAZAFINDRAIBE Onja Jean Pascal retrouve à la fin son état d'origine (sans compte).
//   node tests/acces.e2e.mjs
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
await db.connect();
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const started = new Date();
const email = `conseiller-${Date.now().toString(36)}@pride.local`;
const PASSWORD = "AccesTest2026!";

async function login(address, password = "PrideDemo2026!") {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", address);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/membre/);
  return page;
}
/** Dernier lien « choisissez votre mot de passe » de l'utilisateur (en local, les e-mails ne partent pas). */
async function lastToken(userId) {
  const { rows } = await db.query(`select identifier from verification where value = $1 and identifier like 'reset-password:%' order by created_at desc limit 1`, [userId]);
  return rows[0]?.identifier.split(":")[1] ?? null;
}
const resetToken = async (userId) => (await lastToken(userId)) ?? fail("aucun lien d'invitation créé");

const { rows: [m] } = await db.query(`select id, email, user_id from members where last_name = 'RAZAFINDRAIBE' and first_names = 'Onja Jean Pascal'`);
if (m.user_id) fail("la fiche de test a déjà un compte : base de démonstration modifiée ?");

try {
  const ca = await login("ca@pride.local");
  await ca.goto(`${BASE}/dirigeants/membres/${m.id}`);
  await ca.getByRole("heading", { name: "Mandats" }).waitFor();
  if (await ca.getByRole("heading", { name: "Accès en ligne" }).count()) fail("un membre du CA peut créer un accès");
  log("CA : pas de création d'accès");

  const admin = await login("admin@pride.local");
  await admin.goto(`${BASE}/dirigeants/membres/${m.id}`);
  await admin.fill("#access-email", "ca@pride.local");
  await admin.getByRole("button", { name: "Créer l'accès et envoyer le lien" }).click();
  await admin.getByText("Cette adresse est déjà utilisée par un autre compte.").waitFor();
  await admin.fill("#access-email", email);
  await admin.getByRole("button", { name: "Créer l'accès et envoyer le lien" }).click();
  await admin.getByText(`Accès en ligne créé : un e-mail a été envoyé à ${email}`).waitFor();
  log("administrateur : adresse déjà prise refusée, accès créé");

  const { rows: [{ user_id: userId }] } = await db.query("select user_id from members where id = $1", [m.id]);
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(120_000);
  await page.goto(`${BASE}/nouveau-mot-de-passe?token=${await resetToken(userId)}`);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="confirm"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByText("Mot de passe enregistré").waitFor();
  const conseiller = await login(email, PASSWORD);
  await conseiller.goto(`${BASE}/dirigeants`);
  if (!conseiller.url().endsWith("/dirigeants")) fail("le conseiller n'arrive pas dans l'espace dirigeants");
  log("conseiller : mot de passe choisi avec le lien, connexion, espace dirigeants");

  const before = await lastToken(userId); // le lien utilisé a été effacé par Better Auth
  await admin.reload();
  await admin.getByText(`Ce membre se connecte avec ${email}`).waitFor();
  await admin.getByRole("button", { name: "Renvoyer le lien" }).click();
  await admin.getByText(`Lien renvoyé à ${email}`).waitFor();
  if ((await resetToken(userId)) === before) fail("aucun nouveau lien créé");
  log("lien renvoyé");
} finally {
  // La fiche retrouve son état d'origine : pas de compte (ni sessions, ni liens), pas de cotisations créées par le test.
  const { rows } = await db.query("select user_id from members where id = $1", [m.id]);
  const userId = rows[0]?.user_id;
  await db.query("update members set user_id = $2, email = $3 where id = $1", [m.id, m.user_id, m.email]);
  await db.query("delete from dues where member_id = $1 and status = 'A_PAYER' and payment_id is null and created_at >= $2", [m.id, started]);
  if (userId && userId !== m.user_id) {
    await db.query("delete from verification where value = $1", [userId]);
    await db.query(`delete from "session" where user_id = $1`, [userId]);
    await db.query("delete from account where user_id = $1", [userId]);
    await db.query(`delete from "user" where id = $1`, [userId]);
  }
  await db.end();
  await browser.close();
}
