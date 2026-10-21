// Aide de solidarité : déclaration par un membre, doublon refusé, décision des dirigeants (refus motivé, accord), suivi côté membre, droits d'accès.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/solidarite.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };

// Deux dates passées propres à ce passage, pour pouvoir relancer le test (une demande par membre, événement et date).
const day = (offset) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
const seed = Math.floor(Date.now() / 1000) % 3000;
const DATE_A = day(10 + seed);
const DATE_B = day(3020 + seed);

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

async function declare(page, kind, concerns, date, file) {
  const card = page.locator("div.rounded-2xl", { has: page.getByRole("heading", { name: "Solidarité" }) }).last();
  const again = card.getByRole("button", { name: "Déclarer un autre événement" });
  if (await again.count()) await again.click();
  else await card.getByRole("button", { name: "Déclarer un événement" }).click();
  await card.getByLabel("Type d'événement").selectOption({ label: kind });
  await card.getByLabel("Concerne").selectOption({ label: concerns });
  await card.getByLabel("Date").fill(date);
  if (file) await card.getByLabel("Pièce jointe (facultatif)").setInputFiles(file);
  await card.getByRole("button", { name: "Envoyer la demande" }).click();
  return card;
}

try {
  const member = await login("membre@pride.local");
  const card = member.locator("div.rounded-2xl", { has: member.getByRole("heading", { name: "Solidarité" }) }).last();
  await card.getByRole("button", { name: "Déclarer un événement" }).click();
  await card.getByRole("button", { name: "Envoyer la demande" }).click();
  await card.getByText("Type d'événement : champ obligatoire").waitFor();
  await card.getByRole("button", { name: "Annuler" }).click();
  log("champs obligatoires vérifiés");

  // Pièce jointe : un format refusé, puis un PDF accepté
  await declare(member, "Naissance", "Moi-même", DATE_A, { name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("texte") });
  await card.getByText("Format accepté : PDF, JPG, PNG ou WEBP").waitFor();
  await card.getByLabel("Type d'événement").selectOption({ label: "Naissance" });
  await card.getByLabel("Date").fill(DATE_A);
  await card.getByLabel("Pièce jointe (facultatif)").setInputFiles(new URL("./cv.pdf", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
  await card.getByRole("button", { name: "Envoyer la demande" }).click();
  await card.getByText("Demande transmise au Trésorier").waitFor();
  log("pièce jointe : format refusé, puis PDF accepté");
  await declare(member, "Naissance", "Moi-même", DATE_A);
  await card.getByText("déjà déclaré cet événement").waitFor();
  await card.getByRole("button", { name: "Annuler" }).click();
  log("déclaration envoyée, doublon refusé", DATE_A);

  await member.reload();
  await declare(member, "Décès", "Parent, frère ou sœur", DATE_B);
  await card.getByText("Demande transmise au Trésorier").waitFor();
  log("deuxième déclaration (famille)", DATE_B);

  // Un simple membre n'a pas accès à l'espace dirigeants
  await member.goto(`${BASE}/dirigeants/solidarite`);
  if (member.url().includes("/dirigeants")) fail("un simple membre accède à la page Solidarité des dirigeants");
  log("page dirigeants refusée à un simple membre");

  const admin = await login("admin@pride.local");
  await admin.goto(`${BASE}/dirigeants/solidarite`);
  const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const reqA = admin.locator("div.rounded-2xl", { hasText: `le ${fmt(DATE_A)}` }).filter({ hasText: "Naissance" }).last();
  const reqB = admin.locator("div.rounded-2xl", { hasText: `le ${fmt(DATE_B)}` }).filter({ hasText: "Décès" }).last();
  await reqA.getByText("50 000 Ar").first().waitFor();
  await reqB.getByText("25 000 Ar").first().waitFor();
  log("demandes visibles avec le bon montant (50 000 / 25 000 Ar)");

  const link = reqA.getByRole("link", { name: /Pièce jointe : cv\.pdf/ });
  const res = await admin.request.get(new URL(await link.getAttribute("href"), BASE).href);
  if (res.status() !== 200 || res.headers()["content-type"] !== "application/pdf") fail(`pièce jointe illisible (${res.status()})`);
  if (await reqB.getByRole("link", { name: /Pièce jointe/ }).count()) fail("pièce jointe affichée sur une demande qui n'en a pas");
  const anon = await (await browser.newContext()).request.get(new URL(await link.getAttribute("href"), BASE).href);
  if (anon.status() !== 403) fail(`pièce jointe accessible sans connexion (${anon.status()})`);
  log("pièce jointe ouverte par le dirigeant, refusée sans connexion");

  await reqB.getByRole("button", { name: "Refuser" }).click();
  // Le navigateur bloque l'envoi (champ obligatoire) ; le serveur refuse aussi un motif vide.
  if (!(await reqB.getByLabel("Motif du refus").evaluate((i) => i.validity.valueMissing))) fail("refus envoyé sans motif");
  await reqB.getByLabel("Motif du refus").fill("Test automatique : refus fictif.");
  await reqB.getByRole("button", { name: "Refuser" }).click();
  await admin.getByText("Demande refusée").waitFor();
  log("refus sans motif bloqué, puis refus motivé");

  await reqA.getByRole("button", { name: /^Accorder/ }).click();
  await admin.getByText("Aide accordée").waitFor();
  log("aide accordée");

  await member.goto(`${BASE}/membre`);
  await card.locator("li", { hasText: fmt(DATE_A) }).getByText("Accordée, à verser").waitFor();
  await card.locator("li", { hasText: fmt(DATE_B) }).getByText("Refusée").waitFor();
  log("le membre voit les décisions sur son tableau de bord");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
