// Parcours complet : candidature → contact → agrément par le CA → paiement → visibilité des actualités → droits d'accès.
// Prérequis : base fraîche avec « pnpm db:seed » (comptes de démonstration) et l'application lancée.
//   pnpm exec playwright install chromium   (une seule fois)
//   pnpm test:e2e
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
import { mkdirSync } from "node:fs";
if (process.env.SCREENSHOTS) mkdirSync("captures", { recursive: true });
const shot = (p, n) => (process.env.SCREENSHOTS ? p.screenshot({ path: `captures/${n}.png`, fullPage: true }) : Promise.resolve());
const browser = await chromium.launch();
const log = (...a) => console.log("✔", ...a);
try {
  // 1. Candidature publique
  let page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/adhesion`);
  await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await page.waitForSelector("text=Certains champs sont à compléter");
  log("validation : erreurs affichées sur formulaire vide");
  await page.fill("#lastName", "Rakoto");
  await page.fill("#firstNames", "Hery");
  await page.fill("#birthDate", "1998-04-02");
  await page.fill("#phone", "034 12 345 67");
  await page.fill("#email", "hery@example.mg");
  await page.fill("#address", "Analamahitsy");
  await page.selectOption("#sponsorMemberId", { index: 1 });
  await page.setInputFiles('input[name="doc_RESIDENCE"]', "doc.png");
  await page.setInputFiles('input[name="doc_CIN"]', "doc.png");
  await page.setInputFiles('input[name="doc_CV"]', "cv.pdf");
  await page.setInputFiles('input[name="doc_LETTRE"]', "cv.pdf");
  await page.check('input[name="consent"]');
  await shot(page, "1-adhesion-rempli");
  await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await page.waitForSelector("text=Candidature envoyée");
  const ref = await page.locator("strong").filter({ hasText: /^C-\d{4}-\d{4}$/ }).first().textContent();
  log("candidature envoyée", ref);

  // 2. Contact
  await page.goto(`${BASE}/contact`);
  await page.fill('input[name="name"]', "Visiteur Test");
  await page.fill('input[name="email"]', "visiteur@example.mg");
  await page.fill('input[name="subject"]', "Partenariat");
  await page.fill('textarea[name="message"]', "Bonjour, nous souhaitons collaborer.");
  await page.setInputFiles('input[name="attachments"]', "cv.pdf");
  await shot(page, "2-contact");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await page.waitForSelector("text=Message envoyé");
  log("message de contact envoyé avec pièce jointe");

  // 3. Dirigeant : agrément
  const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await admin.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", "admin@pride.local");
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);
  log("connexion administrateur");
  await page.goto(`${BASE}/dirigeants/adhesions`);
  await shot(page, "3-adhesions");
  await page.getByRole("link", { name: ref }).click();
  await page.waitForSelector("text=Pièces jointes");
  const docResp = await page.request.get(await page.locator('a[href^="/api/fichiers/"]').first().getAttribute("href").then((h) => BASE + h));
  if (docResp.status() !== 200) throw new Error("pièce jointe illisible");
  log("pièce jointe téléchargée par le dirigeant", docResp.headers()["content-type"]);
  await page.getByRole("button", { name: "Soumettre au vote du CA" }).click();
  await page.waitForSelector("text=Délibération du conseil");
  await page.fill("#pour", "4");
  await page.getByRole("button", { name: "Enregistrer la décision" }).click();
  await page.waitForSelector("text=Adhésion agréée par le conseil.");
  log("délibération : 4 pour sur 5 présents → agréée");
  await page.getByRole("button", { name: "Créer la fiche membre" }).click();
  await page.waitForSelector("text=/Fiche membre PRIDE\\d{10} créée/");
  await shot(page, "4-agrement");
  log("fiche membre créée");

  // Publication « membres seulement »
  await page.goto(`${BASE}/dirigeants/actualites`);
  await page.getByText("Annonce", { exact: true }).click();
  await page.fill("#title", "Réunion interne de test");
  await page.fill("#body", "Réservée aux membres.");
  await page.getByText("Membres seulement", { exact: true }).first().click();
  await page.getByRole("button", { name: "Publier" }).click();
  await page.waitForSelector("text=Publication en ligne");
  log("annonce « membres seulement » publiée");

  // 4. Membre : paiement
  const mem = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await mem.newPage();
  await page.goto(`${BASE}/membre`);
  await page.waitForURL(/connexion/);
  await page.fill("#email", "membre@pride.local");
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);
  await shot(page, "5-membre-mobile");
  await page.goto(`${BASE}/membre/cotisations`);
  await page.getByRole("button", { name: /Payer \d/ }).click();
  await page.waitForSelector("text=/Paiement reçu. Reçu n° R-\\d{4}-\\d{4}/");
  await shot(page, "6-paiement");
  log("paiement simulé + reçu");
  await page.goto(`${BASE}/membre/actualites`);
  await page.waitForSelector("text=Réunion interne de test");
  log("le membre voit l'annonce réservée");

  // 5. Le public ne la voit pas ; un membre n'accède pas aux dirigeants
  const pub = await (await fetch(`${BASE}/actualites`)).text();
  if (pub.includes("Réunion interne de test")) throw new Error("annonce membres visible publiquement !");
  log("annonce réservée invisible sur le site public");
  await page.goto(`${BASE}/dirigeants`);
  if (!page.url().endsWith("/membre")) throw new Error("un membre accède à l'espace dirigeants");
  log("membre simple redirigé hors de l'espace dirigeants");
  const forbidden = await page.request.get(`${BASE}/api/fichiers/x`);
  if (forbidden.status() !== 403) throw new Error("fichiers accessibles aux membres");
  log("pièces de candidature interdites aux membres (403)");

  // 6. API mobile
  const me = await page.request.get(`${BASE}/api/v1/me`);
  log("API /api/v1/me", me.status(), JSON.stringify((await me.json()).dues));
  const anon = await fetch(`${BASE}/api/v1/me`);
  if (anon.status !== 401) throw new Error("API accessible sans connexion");
  log("API refuse sans connexion (401)");
} finally {
  await browser.close();
}
