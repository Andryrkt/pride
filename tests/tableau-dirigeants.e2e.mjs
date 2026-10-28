// Tableau de bord des dirigeants selon le rôle : la Secrétaire générale voit ses responsabilités, ses mandats et ses
// tâches (audition à venir), pas celles du CA (délibération après audition, Trésorier à désigner) ; l'administrateur voit tout.
// Prérequis : base avec « pnpm db:seed » (dont secretaire@pride.local) et l'application lancée.
// Crée deux membres fictifs et deux procédures d'exclusion, classées à la fin. Peut être relancé.
//   node tests/tableau-dirigeants.e2e.mjs
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36).toUpperCase();
const procedures = [];

async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);
  await page.getByRole("link", { name: "Espace dirigeants" }).first().click();
  await page.waitForURL(`${BASE}/dirigeants`);
  return page;
}
async function procedure(suffix, hearingAt) {
  const { rows: [m] } = await db.query(`insert into members (number, last_name, first_names, joined_at) values ($1, $2, 'Test (fictif)', now()) returning id`, [`TEST${run}${suffix}`, `TABLEAU-${suffix}-${run}`]);
  procedures.push((await db.query("insert into exclusion_procedures (member_id, reason, hearing_at) values ($1, 'test (fictif)', $2) returning id", [m.id, hearingAt])).rows[0].id);
  return m.id;
}

try {
  await db.connect();
  const upcoming = await procedure("A", new Date(Date.now() + 3 * 86_400_000));
  await procedure("B", new Date(Date.now() - 86_400_000));
  const { rows: treasurer } = await db.query("select 1 from mandates where role = 'TRESORIER' and starts_at <= current_date and (ends_at is null or ends_at >= current_date)");

  const sg = await login("secretaire@pride.local");
  await sg.getByText("Secrétaire générale · Bureau exécutif, art. 14").waitFor();
  await sg.getByText("Rédiger et archiver les procès-verbaux").waitFor();
  await sg.getByRole("heading", { name: "Mandats" }).waitFor();
  const audition = sg.locator("li", { hasText: `Audition de Test (fictif) TABLEAU-A-${run}` });
  await audition.waitFor();
  if (await sg.getByText(`Délibérer sur l'exclusion de Test (fictif) TABLEAU-B-${run}`).count()) fail("la Secrétaire générale voit une délibération du CA");
  if (await sg.getByText("Désigner un Trésorier").count()) fail("la Secrétaire générale voit une tâche du CA");
  await audition.getByRole("link", { name: "Ouvrir" }).click();
  await sg.waitForURL(`${BASE}/dirigeants/membres/${upcoming}`);
  log("Secrétaire générale : responsabilités, mandats, audition à venir ; rien du CA");

  const admin = await login("admin@pride.local");
  await admin.getByText(`Délibérer sur l'exclusion de Test (fictif) TABLEAU-B-${run}`).waitFor();
  await admin.getByText(`Audition de Test (fictif) TABLEAU-A-${run}`).waitFor();
  if (!treasurer.length) await admin.getByText("Désigner un Trésorier").waitFor();
  log("administrateur : tâches de tous les rôles", treasurer.length ? "" : "(dont « Désigner un Trésorier »)");

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  if (procedures.length) await db.query("update exclusion_procedures set status = 'REJETEE' where id = any($1)", [procedures]);
  await db.end();
  await browser.close();
}
