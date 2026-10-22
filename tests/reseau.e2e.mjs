// Formations et offres, compétences et commissions :
// formation avec places limitées, offre proposée → validée → « Je suis intéressé(e) » → clôturée,
// annuaire des compétences (avec accord) et coup de main, demande d'entrée en commission acceptée, proposition d'atelier.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/reseau.e2e.mjs
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
const card = (page, text) => page.locator("div.rounded-2xl", { hasText: text }).last();

try {
  const admin = await login("admin@pride.local");
  const member = await login("membre@pride.local");

  // 1. Formation à une seule place
  const TRAINING = `Formation test ${run} (fictive)`;
  await admin.goto(`${BASE}/dirigeants/actualites`);
  await admin.locator("form").getByText("Formation", { exact: true }).click();
  await admin.fill('input[name="title"]', TRAINING);
  const d = new Date(Date.now() + 5 * 86_400_000);
  await admin.fill('input[name="eventAt"]', `${d.toISOString().slice(0, 10)}T09:00`);
  await admin.fill('input[name="domain"]', "Bureautique");
  await admin.fill('input[name="capacity"]', "1");
  await admin.fill('textarea[name="body"]', "Formation créée par le test automatique. Données fictives.");
  await admin.getByRole("button", { name: "Publier" }).click();
  await admin.waitForURL(/publie=1/);
  await member.goto(`${BASE}/membre/formations`);
  await card(member, TRAINING).getByText("1 place restante").waitFor();
  await card(member, TRAINING).getByRole("button", { name: "S'inscrire" }).click();
  await card(member, TRAINING).getByRole("button", { name: "Inscrit(e) ✓" }).waitFor();
  await admin.goto(`${BASE}/membre/formations`);
  await card(admin, TRAINING).getByText("Complet").first().waitFor();
  if (await card(admin, TRAINING).getByRole("button", { name: "S'inscrire" }).count()) fail("inscription possible sur une formation complète");
  log("formation : inscription, puis « Complet » pour le suivant");

  // 2. Offre proposée par un membre, validée par un dirigeant
  const OFFER = `Stage test ${run} (fictif)`;
  await member.goto(`${BASE}/membre/formations?vue=offres`);
  await member.getByRole("button", { name: "Publier une offre" }).click();
  await member.getByLabel("Type").selectOption({ label: "Stage" });
  await member.getByLabel("Intitulé").fill(OFFER);
  await member.getByLabel("Description").fill("Offre créée par le test automatique. Données fictives.");
  await member.getByRole("button", { name: "Proposer l'offre" }).click();
  await member.getByText("visible dès qu'un dirigeant").waitFor();
  await member.reload();
  await member.locator("li", { hasText: OFFER }).getByText("En attente de validation").waitFor();
  if (await member.getByRole("heading", { name: OFFER }).count()) fail("offre visible avant validation");
  log("offre proposée, invisible avant validation");

  await admin.goto(`${BASE}/dirigeants/offres`);
  await card(admin, OFFER).getByRole("button", { name: "Publier" }).click();
  await admin.getByText("Offre publiée").waitFor();
  await admin.goto(`${BASE}/membre/formations?vue=offres`);
  await card(admin, OFFER).getByRole("button", { name: "Je suis intéressé(e)" }).click();
  await card(admin, OFFER).getByText("Candidature envoyée ✓").waitFor();
  log("offre publiée par un dirigeant, intérêt transmis");

  await member.goto(`${BASE}/membre`);
  await member.locator("li", { hasText: OFFER }).waitFor();
  await member.goto(`${BASE}/membre/formations?vue=offres`);
  await card(member, OFFER).getByText("1 membre(s) intéressé(s)").waitFor();
  await card(member, OFFER).getByRole("button", { name: "Clôturer l'offre" }).click();
  // L'offre quitte la liste publiée et passe dans « Mes offres proposées ».
  await member.locator("li", { hasText: OFFER }).getByText("Clôturée").waitFor();
  log("offre sur le tableau de bord, intéressés visibles par l'auteur, offre clôturée");

  // 3. Annuaire des compétences : accord dans le profil, puis coup de main
  const SKILL = `Test${run}`;
  await member.goto(`${BASE}/membre/profil`);
  // « Quartier / ville » est obligatoire dans le profil ; le compte de démo n'en a pas toujours.
  if (!(await member.inputValue('input[name="address"]'))) await member.fill('input[name="address"]', "Analamahitsy, Antananarivo (fictif)");
  await member.fill('input[name="skills"]', `Excel, ${SKILL}`);
  await member.locator('input[name="shareSkills"]').check();
  await member.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await member.getByText("Profil enregistré").waitFor();
  await admin.goto(`${BASE}/membre/competences?competence=${SKILL}`);
  const person = card(admin, SKILL);
  await person.waitFor();
  const help = person.getByRole("button", { name: "Demander un coup de main" });
  if (await help.count()) await help.click();
  await person.getByText("Demande envoyée ✓").waitFor();
  log("annuaire : le membre apparaît avec son accord, coup de main demandé");

  // 4. Demande d'entrée dans une commission, acceptée par un dirigeant
  await member.goto(`${BASE}/membre/competences`);
  const joinable = member.locator("div.rounded-2xl", { has: member.getByRole("button", { name: "Rejoindre" }) }).last();
  if (await joinable.count()) {
    const name = (await joinable.locator("div.font-bold").first().textContent()).trim();
    await joinable.getByRole("button", { name: "Rejoindre" }).click();
    await card(member, name).getByText("Demande en attente").waitFor();
    await admin.goto(`${BASE}/dirigeants/commissions`);
    await admin.getByRole("heading", { name }).click();
    await admin.locator("li", { hasText: "RASOANAIVO" }).getByRole("button", { name: "Accepter" }).click();
    await admin.getByText("Demande acceptée").waitFor();
    await member.reload();
    await card(member, name).getByText("Membre ✓").waitFor();
    log("commission", name, ": demande envoyée puis acceptée");
  } else {
    log("commissions : le membre fait déjà partie de toutes (test déjà relancé souvent)");
  }

  // 5. Proposition d'atelier
  await member.goto(`${BASE}/membre/formations`);
  await member.getByRole("button", { name: "Proposer un atelier" }).click();
  await member.getByLabel("Thème de l'atelier").fill(`Atelier test ${run} (fictif)`);
  await member.getByLabel("Public visé et durée").fill("Test automatique.");
  await member.getByRole("button", { name: "Envoyer ma proposition" }).click();
  await member.getByText("Proposition transmise à la Commission formation et projets").waitFor();
  log("proposition d'atelier transmise");

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
