// Guide des membres (/aide) : chaque page s'ouvre, chaque capture d'écran se charge, la version imprimée est propre.
// Prérequis : application lancée (aucune connexion nécessaire).
//   node tests/aide.e2e.mjs
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(120_000);
  await page.goto(`${BASE}/aide`);
  const links = await page.locator("main ol a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  if (links.length < 10) fail(`seulement ${links.length} pages dans le guide`);
  log(links.length, "pages dans le sommaire");

  for (const href of links) {
    await page.goto(`${BASE}${href}`);
    await page.locator("main ol li").first().waitFor();
    const broken = await page.locator("main img").evaluateAll((imgs) => Promise.all(imgs.map(async (i) => { i.scrollIntoView(); await i.decode().catch(() => {}); return i.naturalWidth > 0 ? null : i.getAttribute("src"); })));
    if (broken.some(Boolean)) fail(`${href} : capture introuvable ${broken.filter(Boolean).join(", ")}`);
  }
  log("toutes les pages s'ouvrent et toutes les captures se chargent");

  await page.goto(`${BASE}/aide/cotisations`);
  await page.emulateMedia({ media: "print" });
  if (await page.getByRole("navigation", { name: "Navigation principale" }).isVisible()) fail("le menu du site apparaît à l'impression");
  if (await page.getByRole("button", { name: "Imprimer cette page" }).isVisible()) fail("le bouton Imprimer apparaît à l'impression");
  log("impression : menus et boutons masqués");

  await page.goto(`${BASE}/aide/imprimer`);
  await page.locator("article").last().waitFor();
  await page.evaluate(async () => { for (const i of document.images) { i.loading = "eager"; await i.decode().catch(() => {}); } });
  const pdf = await PDFDocument.load(await page.pdf({ format: "A4", printBackground: true }));
  if (pdf.getPageCount() < 11) fail(`PDF du guide : ${pdf.getPageCount()} page(s) seulement`);
  log("guide complet en PDF :", pdf.getPageCount(), "pages A4");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
