// Commissions : désignation du responsable pour un an, remplacement, composition, fin de mandat, affichage public, droits d'accès.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/commissions.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SLUG = "communication";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);

async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);
  return page;
}

try {
  const page = await login("admin@pride.local");
  await page.goto(`${BASE}/dirigeants/commissions`);
  await page.getByRole("heading", { name: "Communication" }).click();
  await page.waitForURL(`${BASE}/dirigeants/commissions/${SLUG}`);
  log("liste des commissions → fiche Communication");

  // Repartir d'une commission sans responsable
  const end = page.getByRole("button", { name: "Mettre fin au mandat" });
  if (await end.count()) {
    await end.click();
    await page.waitForSelector("text=Mandat terminé");
  }

  const designate = page.locator("form", { has: page.locator("#responsableId") });
  const options = await page.locator("#responsableId option:not([disabled])").evaluateAll((os) => os.map((o) => [o.value, o.textContent]));
  if (options.length < 2) throw new Error("il faut au moins deux membres actifs");
  const [[firstId, firstName], [secondId, secondName]] = options;

  await page.selectOption("#responsableId", firstId);
  await designate.getByRole("button", { name: "Désigner" }).click();
  await page.waitForSelector("text=Responsable désigné pour un an.");
  const nextYear = new Date().getFullYear() + 1;
  if (!(await page.getByText(new RegExp(`au \\d+ \\S+ ${nextYear}`)).first().count())) throw new Error("fin de mandat attendue dans un an");
  log("responsable désigné pour un an :", firstName);

  await page.selectOption("#responsableId", firstId);
  await designate.getByRole("button", { name: "Désigner" }).click();
  await page.waitForSelector("text=déjà responsable");
  log("refus : le même membre ne peut pas être désigné deux fois");

  // Le message « Responsable désigné » est déjà affiché : on attend le nom du nouveau responsable.
  const secondShort = secondName.replace(/\s*\(.*\)$/, "");
  await page.selectOption("#responsableId", secondId);
  await designate.getByRole("button", { name: "Désigner" }).click();
  await page.locator("strong.text-lg", { hasText: secondShort }).waitFor();
  await page.locator("li", { hasText: firstName.replace(/\s*\(.*\)$/, "") }).filter({ hasText: "Annulé" }).first().waitFor();
  log("remplacement le jour même : mandat précédent annulé, nouveau responsable", secondShort);

  // L'ancien responsable reste membre et peut être retiré ; le responsable en cours non
  const row = page.locator("li", { hasText: firstName.replace(/\s*\(.*\)$/, "") }).filter({ has: page.getByRole("button", { name: "Retirer" }) });
  await row.getByRole("button", { name: "Retirer" }).click();
  await page.waitForSelector("text=Membre retiré de la commission.");
  log("ancien responsable retiré de la commission");

  await page.selectOption("#memberId", { index: 1 });
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.waitForSelector("text=Membre ajouté à la commission.");
  log("membre ajouté");

  const pub = await (await fetch(`${BASE}/association`)).text();
  if (!pub.includes("Responsable : ")) throw new Error("responsable absent de la page publique");
  log("page publique : responsable affiché");

  await page.getByRole("button", { name: "Mettre fin au mandat" }).click();
  await page.waitForSelector("text=Mandat terminé");
  log("fin de mandat anticipée");

  const member = await login("membre@pride.local");
  await member.goto(`${BASE}/dirigeants/commissions`);
  if (!member.url().endsWith("/membre")) throw new Error("un membre accède aux commissions des dirigeants");
  log("membre simple redirigé hors de l'espace dirigeants");
} finally {
  await browser.close();
}
