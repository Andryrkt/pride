// Inscription publique aux événements (« Je participe ») : publication d'un événement public, inscription sans compte,
// numéro déjà inscrit refusé (même écrit autrement), liste des inscrits côté dirigeants, événement « membres » absent de l'agenda public.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/inscriptions.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36);
const TITLE = `Événement de test ${run} (fictif)`;
const PRIVATE = `Réunion interne ${run} (fictif)`;
// Numéro fictif propre à ce passage, pour pouvoir relancer le test.
const digits = String(Date.now()).slice(-7);
const PHONE = `034 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;

const ctxOpts = { viewport: { width: 1280, height: 900 } };

async function publish(page, title, visibility) {
  await page.goto(`${BASE}/dirigeants/actualites`);
  await page.locator("form").getByText("Événement", { exact: true }).click();
  await page.fill('input[name="title"]', title);
  const d = new Date(Date.now() + 10 * 86_400_000);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T14:00`;
  await page.fill('input[name="eventAt"]', local);
  await page.fill('input[name="location"]', "CLT Tsiadana");
  await page.fill('textarea[name="body"]', "Événement créé par le test automatique. Données fictives.");
  await page.locator("form").getByText(visibility, { exact: true }).click();
  await page.getByRole("button", { name: "Publier" }).click();
  await page.waitForURL(/publie=1/);
}

try {
  const admin = await (await browser.newContext(ctxOpts)).newPage();
  admin.context().setDefaultTimeout(120_000);
  await admin.goto(`${BASE}/connexion`);
  await admin.fill("#email", "admin@pride.local");
  await admin.fill("#password", "PrideDemo2026!");
  await admin.getByRole("button", { name: "Se connecter" }).click();
  await admin.waitForURL(`${BASE}/membre`);
  await publish(admin, TITLE, "Tout le monde");
  await publish(admin, PRIVATE, "Membres seulement");
  log("deux événements publiés (public et membres)");

  // Visiteur sans compte
  const visitor = await (await browser.newContext(ctxOpts)).newPage();
  visitor.context().setDefaultTimeout(120_000);
  await visitor.goto(`${BASE}/actualites?vue=agenda`);
  if (await visitor.getByText(PRIVATE).count()) fail("l'événement réservé aux membres apparaît dans l'agenda public");
  log("événement « membres » absent de l'agenda public");

  const card = visitor.locator("div.rounded-2xl", { has: visitor.getByRole("link", { name: TITLE }) }).last();
  await card.getByRole("button", { name: "Je participe" }).click();
  await card.getByRole("button", { name: "Confirmer ma participation" }).click();
  await card.getByText("Nom et prénom : champ obligatoire").waitFor();
  log("champs obligatoires vérifiés");

  await card.getByLabel("Nom et prénom").fill("RAKOTO Test (fictif)");
  await card.getByLabel("Téléphone").fill(PHONE);
  await card.getByRole("button", { name: "Confirmer ma participation" }).click();
  await card.getByText("Inscription enregistrée").waitFor();
  log("inscription enregistrée", PHONE);

  // Même numéro, écrit au format international : refusé
  await visitor.reload();
  await card.getByRole("button", { name: "Je participe" }).click();
  await card.getByLabel("Nom et prénom").fill("RAKOTO Test (fictif)");
  await card.getByLabel("Téléphone").fill(`+261 ${PHONE.slice(1)}`);
  await card.getByRole("button", { name: "Confirmer ma participation" }).click();
  await card.getByText("déjà inscrit").waitFor();
  log("doublon refusé (+261…)");

  // Côté dirigeants
  await admin.goto(`${BASE}/dirigeants/actualites`);
  const ev = admin.locator("details", { hasText: TITLE });
  await ev.getByText("1 inscrit(s)").waitFor();
  await ev.locator("summary").click();
  await ev.getByText(PHONE.replace(/\s/g, "")).waitFor();
  log("liste des inscrits visible par les dirigeants");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
