// Consultation en ligne : ouverte par un dirigeant, annoncée sur le tableau de bord, vote anonyme une seule fois, résultats.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/consultation.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36);
const QUESTION = `Thème prioritaire ${run} ? (fictif)`;

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
const poll = (page) => page.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: QUESTION }) }).last();
async function vote(page, option) {
  await page.goto(`${BASE}/membre/ag`);
  await poll(page).getByLabel(option).check();
  await poll(page).getByRole("button", { name: "Valider mon vote" }).click();
  await poll(page).getByText("Merci, votre vote est enregistré").waitFor();
}

try {
  const admin = await login("admin@pride.local");
  await admin.goto(`${BASE}/dirigeants/ag`);
  const form = admin.locator("form", { has: admin.getByRole("button", { name: "Ouvrir la consultation" }) });
  await form.getByLabel("Question").fill(QUESTION);
  await form.getByLabel("Réponses possibles").fill("Une seule réponse");
  await form.getByRole("button", { name: "Ouvrir la consultation" }).click();
  await form.getByText("de 2 à 6").waitFor();
  await form.getByLabel("Réponses possibles").fill("Intelligence artificielle\nEntrepreneuriat\nLangues");
  await form.getByRole("button", { name: "Ouvrir la consultation" }).click();
  await form.getByText("Consultation ouverte").waitFor();
  log("consultation ouverte (1 seule réponse refusée)");

  const member = await login("membre@pride.local");
  await member.getByText(/vote(s)? en ligne ouvert/).waitFor();
  await member.getByRole("link", { name: "Voter" }).click();
  await member.waitForURL(/\/membre\/ag/);
  await poll(member).getByRole("button", { name: "Valider mon vote" }).click();
  await poll(member).getByText("Choisissez une réponse.").last().waitFor();
  await vote(member, "Entrepreneuriat");
  await poll(member).getByText("1 vote · vote anonyme").waitFor();
  await poll(member).getByRole("img", { name: "Entrepreneuriat : 1 voix sur 1" }).waitFor();
  log("tableau de bord → vote ; réponse obligatoire ; résultats après le vote");

  await member.reload();
  if (await poll(member).getByRole("button", { name: "Valider mon vote" }).count()) fail("le membre peut voter deux fois");
  log("un seul vote par membre");

  await vote(admin, "Langues");
  await admin.goto(`${BASE}/dirigeants/ag`);
  const results = poll(admin);
  await results.getByText("2 votes · vote anonyme").waitFor();
  await results.getByRole("img", { name: "Entrepreneuriat : 1 voix sur 2" }).waitFor();
  await results.getByRole("img", { name: "Langues : 1 voix sur 2" }).waitFor();
  log("résultats côté dirigeants : 2 votes, 50 / 50");

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
