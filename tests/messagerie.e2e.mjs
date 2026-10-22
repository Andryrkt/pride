// Messagerie : assistant par mots-clés (avec les données du membre), transmission à un responsable,
// pièce jointe, réponse d'un dirigeant, pastille « non lu ».
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/messagerie.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36);

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
const thread = (page) => page.getByRole("region", { name: "Conversation" });
async function say(page, text) {
  await page.getByLabel("Votre message").fill(text);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await thread(page).getByText(text).last().waitFor();
}

try {
  const member = await login("membre@pride.local");
  await member.goto(`${BASE}/membre/messages`);
  await thread(member).getByText("Je suis l'assistant PRIDe").first().waitFor();
  log("l'assistant se présente");

  await thread(member).getByRole("button", { name: "Ma cotisation" }).last().click();
  await thread(member).getByText(/à payer|sont à jour/).last().waitFor();
  await thread(member).getByRole("link", { name: /Payer ma cotisation|Mes cotisations/ }).last().waitFor();
  log("bouton « Ma cotisation » : réponse avec les données du membre et lien");

  await say(member, `Quand a lieu l'AG ? (${run})`);
  await thread(member).getByText(/assemblée générale/i).last().waitFor();
  await say(member, `Bonjour ${run}`);
  await thread(member).getByText("Je n'ai pas bien compris").last().waitFor();
  log("mots-clés : AG reconnue, question inconnue → menu");

  const QUESTION = `Question test ${run} sur mon reçu de juin (fictif)`;
  await say(member, QUESTION);
  await say(member, "Je voudrais parler à un responsable");
  await thread(member).getByText("À qui voulez-vous").last().waitFor();
  await thread(member).getByRole("button", { name: "Trésorier" }).click();
  await thread(member).getByText("transmise à « Trésorier »").last().waitFor();
  await thread(member).getByRole("link", { name: "Ouvrir la conversation" }).last().click();
  await member.waitForURL(/c=TRESORIER/);
  await thread(member).getByText(`Question transmise par l'assistant : « ${QUESTION} »`).waitFor();
  log("transmission au Trésorier avec la dernière question");

  await member.locator('input[name="attachment"]').setInputFiles(new URL("./cv.pdf", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
  await say(member, `Voici mon justificatif ${run}`);
  await thread(member).getByRole("link", { name: "cv.pdf" }).last().waitFor();
  log("message avec pièce jointe");

  // Côté dirigeants
  const admin = await login("admin@pride.local");
  await admin.goto(`${BASE}/dirigeants/messages`);
  await admin.getByRole("navigation", { name: "Conversations" }).getByRole("link", { name: /Trésorier/ }).filter({ hasText: "RASOANAIVO" }).first().click();
  await thread(admin).getByText(`Voici mon justificatif ${run}`).waitFor();
  const href = await thread(admin).getByRole("link", { name: "cv.pdf" }).last().getAttribute("href");
  const pdf = await admin.request.get(new URL(href, BASE).href);
  if (pdf.status() !== 200 || pdf.headers()["content-type"] !== "application/pdf") fail(`pièce jointe illisible (${pdf.status()})`);
  const anon = await (await browser.newContext()).request.get(new URL(href, BASE).href);
  if (anon.status() !== 403) fail(`pièce jointe accessible sans connexion (${anon.status()})`);
  const REPLY = `Réponse test ${run} : c'est corrigé (fictif).`;
  await say(admin, REPLY);
  log("le dirigeant voit la conversation et la pièce jointe, et répond");

  await member.goto(`${BASE}/membre`);
  const badge = member.getByRole("link", { name: /^Messagerie/ });
  if (!/\d/.test(await badge.textContent())) fail("pas de pastille « non lu » sur Messagerie");
  await member.goto(`${BASE}/membre/messages?c=TRESORIER`);
  await thread(member).getByText(REPLY.split(" : ")[0], { exact: false }).last().waitFor();
  log("le membre voit la pastille, puis la réponse");

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
