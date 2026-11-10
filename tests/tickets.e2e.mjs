// « Signaler un problème » : le membre envoie un bug avec capture d'écran depuis le menu du compte (page notée automatiquement),
// l'administrateur le voit, le prend en charge puis le résout ; le membre voit « Résolu » et la réponse ; page Tickets refusée à un dirigeant non administrateur.
// Prérequis : base avec « pnpm db:seed » et l'application lancée. Peut être relancé.
//   node tests/tickets.e2e.mjs
import { chromium, request } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36);
// PNG 1 × 1 valide, pour la capture d'écran
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(240_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);
  return page;
}

try {
  const member = await login("membre@pride.local");
  await member.goto(`${BASE}/membre/cotisations`);
  await member.getByRole("button", { name: /menu du compte/ }).click();
  await member.getByRole("menuitem", { name: "Signaler un problème" }).click();
  await member.waitForURL(/\/membre\/signaler\?page=%2Fmembre%2Fcotisations/);
  await member.getByText("/membre/cotisations").waitFor();
  const title = `Bouton test ${run} (fictif)`;
  await member.getByLabel("Titre").fill(title);
  await member.getByLabel("Description").fill("J'ai cliqué, rien ne s'est passé (test automatique).");
  await member.setInputFiles("#screenshot", { name: "capture.png", mimeType: "image/png", buffer: PNG });
  await member.getByRole("button", { name: "Envoyer le signalement" }).click();
  await member.getByText(/Signalement T-\d{4} envoyé/).waitFor();
  await member.locator("li", { hasText: title }).getByText("Nouveau").waitFor();
  log("membre : signalement envoyé depuis le menu du compte, page notée, capture jointe");

  // Refusé à un dirigeant non administrateur
  const sg = await request.newContext({ baseURL: BASE, timeout: 240_000, maxRedirects: 0, extraHTTPHeaders: { Origin: BASE } });
  await sg.post("/api/auth/sign-in/email", { data: { email: "secretaire@pride.local", password: "PrideDemo2026!" } });
  const r = await sg.get("/dirigeants/tickets");
  if (r.status() !== 307) fail(`Secrétaire générale : ${r.status()} au lieu d'un renvoi`);
  await sg.dispose();
  log("page Tickets refusée à la Secrétaire générale");

  const admin = await login("admin@pride.local");
  await admin.goto(`${BASE}/dirigeants/tickets`);
  let card = admin.locator("div.rounded-2xl", { hasText: title }).last();
  await card.getByText("/membre/cotisations").waitFor();
  if (!(await card.locator("img").count())) fail("capture d'écran absente pour l'administrateur");
  await card.getByRole("button", { name: "Prendre en charge" }).click();
  await admin.getByText("Ticket pris en charge").waitFor();
  card = admin.locator("div.rounded-2xl", { hasText: title }).last();
  await card.getByText("En cours").first().waitFor();
  await card.getByLabel("Message à l'auteur (facultatif)").fill("Corrigé, merci (test).");
  await card.getByRole("button", { name: "Résolu" }).click();
  await admin.getByText("Ticket résolu").waitFor();
  log("administrateur : ticket pris en charge, puis résolu avec un message");

  await member.reload();
  const mine = member.locator("li", { hasText: title });
  await mine.getByText("Résolu").waitFor();
  await mine.getByText("Corrigé, merci (test).").waitFor();
  log("membre : « Résolu » et la réponse visibles");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
