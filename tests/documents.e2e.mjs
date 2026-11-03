// Documents officiels : tâche « Publier les statuts » de la Secrétaire générale, publication d'un PDF public (site et espace
// membres), document réservé aux membres, refus d'un faux PDF, nouvelle version qui archive l'ancienne, accès refusé au simple membre.
// Prérequis : base avec « pnpm db:seed » (dont secretaire@pride.local) et l'application lancée.
// Archive au départ les statuts en vigueur (données de démonstration), puis publie des documents fictifs. Peut être relancé.
//   node tests/documents.e2e.mjs
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36).toUpperCase();
const pdf = (name) => ({ name, mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${name} (fictif)\n%%EOF\n`) });

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
async function publish(page, { kind, title, visibility = "PUBLIC", file }) {
  await page.goto(`${BASE}/dirigeants/documents`);
  const form = page.locator("form", { has: page.getByRole("button", { name: "Publier" }) });
  await form.getByLabel("Type de document").selectOption(kind);
  await form.getByLabel("Titre").fill(title);
  await form.getByLabel("Date d'adoption").fill("2026-09-27");
  await form.getByLabel("Visible par").selectOption(visibility);
  await form.locator('input[type="file"]').setInputFiles(file);
  await form.getByRole("button", { name: "Publier" }).click();
}

try {
  await db.connect();
  await db.query("update official_documents set archived_at = now() where kind = 'STATUTS' and archived_at is null");

  // 1. La Secrétaire générale voit la tâche, publie les statuts : la tâche disparaît
  const sg = await login("secretaire@pride.local", "/membre");
  await sg.goto(`${BASE}/dirigeants`);
  await sg.locator("li", { hasText: "Publier : statuts en vigueur" }).getByRole("link", { name: "Publier" }).click();
  await sg.waitForURL(`${BASE}/dirigeants/documents`);
  const STATUTS = `Statuts de l'association ${run} (fictif)`;
  await publish(sg, { kind: "STATUTS", title: STATUTS, file: pdf("statuts.pdf") });
  await sg.getByText(/publié sur le site public et dans l'espace membres\. .*Actualité publiée, e-mail envoyé à \d+ membre/).waitFor();
  await sg.goto(`${BASE}/dirigeants`);
  if (await sg.getByText("Publier : statuts en vigueur").count()) fail("la tâche reste affichée après la publication");
  log("Secrétaire générale : tâche « Publier les statuts », publication, tâche disparue");

  // 2. Site public : lien vers le PDF, téléchargeable sans compte
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`${BASE}/association`);
  const link = visitor.getByRole("link", { name: `${STATUTS} (PDF)` });
  const res = await visitor.request.get(new URL(await link.getAttribute("href"), BASE).href);
  if (res.status() !== 200 || res.headers()["content-type"] !== "application/pdf") fail(`PDF public : ${res.status()}`);
  await visitor.goto(`${BASE}/actualites`);
  await visitor.getByText(`Nouveau document : ${STATUTS}`).first().waitFor();
  log("site public : statuts téléchargeables sans compte, actualité publiée");

  // 3. Document réservé aux membres : absent du site public, refusé sans compte, visible dans l'espace membres
  const PV = `PV de l'AG du 27 septembre 2026 ${run} (fictif)`;
  await publish(sg, { kind: "PV", title: PV, visibility: "MEMBRES", file: pdf("pv.pdf") });
  await sg.getByText(`« ${PV} » publié dans l'espace membres.`).waitFor();
  const { rows: [pv] } = await db.query("select id from official_documents where title = $1", [PV]);
  if ((await visitor.request.get(`${BASE}/api/documents/${pv.id}`)).status() !== 403) fail("PV réservé aux membres accessible sans compte");
  await visitor.goto(`${BASE}/association`);
  if (await visitor.getByText(PV).count()) fail("PV réservé aux membres affiché sur le site public");
  await visitor.goto(`${BASE}/actualites`);
  if (await visitor.getByText(`Nouveau document : ${PV}`).count()) fail("annonce d'un document réservé aux membres sur le site public");
  const member = await login("membre@pride.local", "/membre");
  await member.goto(`${BASE}/membre/ag`);
  await member.getByText(PV).waitFor();
  await member.goto(`${BASE}/membre/actualites`);
  await member.getByText(`Nouveau document : ${PV}`).first().waitFor();
  log("document réservé aux membres : espace membres seulement");

  // 4. Un faux PDF est refusé ; une nouvelle version des statuts archive l'ancienne
  await publish(sg, { kind: "AUTRE", title: `Faux ${run}`, file: { name: "faux.pdf", mimeType: "application/pdf", buffer: Buffer.from("pas un pdf") } });
  await sg.getByText("Le document doit être un fichier PDF.").waitFor();
  await publish(sg, { kind: "STATUTS", title: `${STATUTS} v2`, file: pdf("statuts-v2.pdf") });
  await sg.getByText(/L'ancienne version, s'il y en avait une, est aux archives/).waitFor();
  const { rows: versions } = await db.query("select title, archived_at from official_documents where title like $1 order by created_at", [`${STATUTS}%`]);
  if (versions.length !== 2 || !versions[0].archived_at || versions[1].archived_at) fail(`versions des statuts : ${JSON.stringify(versions)}`);
  log("faux PDF refusé ; nouvelle version des statuts, l'ancienne aux archives");

  // 5. Un simple membre n'accède pas à la gestion des documents
  await member.goto(`${BASE}/dirigeants/documents`);
  if (member.url().includes("/dirigeants")) fail("un simple membre accède à la gestion des documents");
  log("simple membre : gestion des documents refusée");

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
  await browser.close();
}
