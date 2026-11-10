// « Mon CV » : lien depuis le profil, modification sur l'aperçu du CV (titre, expérience, formation, langue), enregistrement, PDF téléchargé.
// Prérequis : base avec « pnpm db:seed » et l'application lancée. Remplace le CV de membre@pride.local. Peut être relancé.
//   node tests/cv.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(240_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", "membre@pride.local");
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);

  await page.goto(`${BASE}/membre/profil`);
  await page.getByRole("link", { name: "Créer ou modifier mon CV" }).click();
  await page.waitForURL(`${BASE}/membre/cv`);
  log("profil : lien vers « Mon CV »");

  // On repart d'un CV vide de lignes : retire les expériences et formations d'un passage précédent.
  for (const what of ["cette expérience", "cette formation"]) {
    while (await page.getByRole("button", { name: `Retirer ${what}` }).count()) await page.getByRole("button", { name: `Retirer ${what}` }).first().click();
  }
  await page.getByLabel("Titre du CV").fill(`Assistant comptable ${run}`);
  await page.getByLabel("Profil", { exact: true }).fill("Rigoureux et curieux (CV fictif de test).");
  await page.getByRole("button", { name: "Ajouter une expérience" }).click();
  await page.getByLabel("Poste ou mission").fill("Trésorier adjoint (fictif)");
  await page.getByLabel("Organisme").fill("Commission sociale PRIDe");
  await page.getByLabel("Période").fill("2025 – aujourd'hui");
  await page.getByRole("button", { name: "Ajouter une formation" }).click();
  await page.getByLabel("Diplôme ou formation").fill("Licence en gestion");
  await page.getByLabel("Établissement").fill("Université d'Antananarivo");
  await page.getByLabel("Année").fill("2024");
  await page.getByRole("button", { name: "Enregistrer mon CV" }).click();
  await page.getByText("CV enregistré").waitFor();
  await page.reload();
  if ((await page.getByLabel("Titre du CV").inputValue()) !== `Assistant comptable ${run}`) fail("titre non enregistré");
  if ((await page.getByLabel("Organisme").inputValue()) !== "Commission sociale PRIDe") fail("expérience non enregistrée");
  log("CV enregistré et retrouvé après rechargement");

  const pdf = await page.request.get(`${BASE}/api/cv`);
  const body = await pdf.body();
  if (pdf.status() !== 200 || pdf.headers()["content-type"] !== "application/pdf" || body.subarray(0, 4).toString() !== "%PDF") fail(`PDF : ${pdf.status()}`);
  if (!/attachment; filename="CV-.+\.pdf"/.test(pdf.headers()["content-disposition"] ?? "")) fail("nom de fichier inattendu");
  await page.getByRole("link", { name: "Télécharger en PDF" }).waitFor();
  log(`PDF du CV téléchargé (${Math.round(body.length / 1024)} ko)`);
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
