// Aide (/aide) : guides des candidats, des membres et des dirigeants, questions fréquentes.
// Chaque page s'ouvre, chaque capture se charge, l'impression est propre ; le guide des dirigeants leur est réservé.
// Prérequis : application lancée, base avec démo.
//   node tests/aide.e2e.mjs
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };

async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  if (email) {
    await page.goto(`${BASE}/connexion`);
    await page.fill("#email", email);
    await page.fill("#password", "PrideDemo2026!");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(`${BASE}/membre`);
  }
  return page;
}

async function checkGuide(page, guide) {
  await page.goto(`${BASE}/aide/${guide}`);
  const links = await page.locator("main ol a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  if (links.length < 2) fail(`${guide} : ${links.length} page(s) seulement`);
  for (const href of links) {
    await page.goto(`${BASE}${href}`);
    await page.locator("main ol li").first().waitFor();
    const broken = await page.locator("main img").evaluateAll((imgs) => Promise.all(imgs.map(async (i) => { i.scrollIntoView(); await i.decode().catch(() => {}); return i.naturalWidth > 0 ? null : i.getAttribute("src"); })));
    if (broken.some(Boolean)) fail(`${href} : capture introuvable ${broken.filter(Boolean).join(", ")}`);
  }
  await page.goto(`${BASE}/aide/${guide}/imprimer`);
  await page.locator("article").last().waitFor();
  await page.evaluate(async () => { for (const i of document.images) { i.loading = "eager"; await i.decode().catch(() => {}); } });
  const pdf = await PDFDocument.load(await page.pdf({ format: "A4", printBackground: true }));
  if (pdf.getPageCount() < links.length + 1) fail(`${guide} : PDF de ${pdf.getPageCount()} page(s) pour ${links.length} parties`);
  log(`${guide} : ${links.length} pages, captures chargées, PDF de ${pdf.getPageCount()} pages A4`);
}

try {
  // Visiteur : candidats, membres, questions ; pas de guide des dirigeants
  const visitor = await login();
  await visitor.goto(`${BASE}/aide`);
  if (await visitor.getByText("Guide des dirigeants").count()) fail("guide des dirigeants visible par un visiteur");
  await checkGuide(visitor, "candidats");
  await checkGuide(visitor, "membres");
  await visitor.goto(`${BASE}/aide/dirigeants`);
  if (!visitor.url().includes("/connexion")) fail("guide des dirigeants ouvert sans connexion");
  log("guide des dirigeants refusé à un visiteur");

  await visitor.goto(`${BASE}/aide/questions`);
  const questions = visitor.locator("main details");
  if ((await questions.count()) < 15) fail(`seulement ${await questions.count()} questions`);
  await questions.first().locator("summary").click();
  await visitor.getByText("Déposez votre candidature en ligne").waitFor();
  log(await questions.count(), "questions fréquentes, réponses dépliables");

  await visitor.goto(`${BASE}/aide/membres/cotisations`);
  await visitor.emulateMedia({ media: "print" });
  if (await visitor.getByRole("navigation", { name: "Navigation principale" }).isVisible()) fail("le menu du site apparaît à l'impression");
  log("impression : menus et boutons masqués");

  // Membre simple : toujours pas de guide des dirigeants
  const member = await login("membre@pride.local");
  await member.goto(`${BASE}/aide/dirigeants`);
  if (member.url().includes("/aide/dirigeants")) fail("guide des dirigeants ouvert à un simple membre");
  log("guide des dirigeants refusé à un simple membre");

  // Dirigeant : le guide apparaît et s'ouvre
  const admin = await login("admin@pride.local");
  await admin.goto(`${BASE}/aide`);
  await admin.getByText("Guide des dirigeants").waitFor();
  await checkGuide(admin, "dirigeants");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
