// Assemblée générale : préparation, convocation, séance sans quorum (carence), deuxième convocation sans quorum,
// votes selon la majorité choisie, clôture, procès-verbal (dirigeants et membres), droits d'accès.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/ag.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const inDays = (n) => {
  const d = new Date(Date.now() + n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T09:00`;
};

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

/**
 * Soumet un formulaire, attend la réponse du serveur, puis le message de retour (bandeau « ok » ou erreur).
 * Attendre la réponse évite de confondre avec le message identique laissé par l'action précédente.
 */
async function submit(page, button, expected) {
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined), button.click()]);
  await page.getByText(expected).first().waitFor();
}

async function addResolution(page, title, majority) {
  const details = page.locator("details", { hasText: "Ajouter une résolution" });
  if (!(await details.evaluate((d) => d.open))) await details.locator("summary").click();
  const form = details.locator("form");
  await form.locator("#resolution-title").fill(title);
  await form.locator("#resolution-text").fill(`L'assemblée générale approuve : ${title.toLowerCase()}.`);
  await form.locator("#resolution-majority").selectOption(majority);
  await submit(page, form.getByRole("button", { name: "Ajouter" }), "Résolution ajoutée.");
}

async function sign(page, count) {
  for (let i = 1; i <= count; i++) {
    await page.selectOption("#memberId", { index: 1 });
    await submit(page, page.getByRole("button", { name: "Émarger" }), "Présence enregistrée");
    await page.locator("h2", { hasText: `Émargement (${i})` }).waitFor();
  }
}

try {
  const page = await login("admin@pride.local");
  const stamp = Date.now().toString(36);

  // 1. Préparation
  await page.goto(`${BASE}/dirigeants/ag`);
  await page.fill("#title", `AG de test ${stamp}`);
  await page.fill("#scheduledAt", inDays(20));
  await submit(page, page.getByRole("button", { name: "Créer l'AG" }), "AG créée.");
  const ag1 = page.url().split("?")[0];
  log("AG créée", await page.locator("h1").textContent());
  await addResolution(page, "Approbation du rapport moral", "SIMPLE");
  await addResolution(page, "Modification des statuts", "DEUX_TIERS");
  log("deux résolutions ajoutées (majorité simple, deux tiers)");

  // 2. Convocation
  await submit(page, page.getByRole("button", { name: "Envoyer la convocation" }), "Convocation envoyée");
  if (await page.getByText("moins que les 15 jours").count()) throw new Error("alerte de délai inattendue (20 jours)");
  log("convocation envoyée, délai de 15 jours respecté");

  const member = await login("membre@pride.local");
  await member.goto(`${BASE}/membre/ag`);
  await member.getByText(`AG de test ${stamp}`).click();
  await member.getByText("2. Modification des statuts").waitFor();
  log("membre : convocation et résolutions visibles");

  // 3. Séance sans quorum → carence
  await page.goto(ag1);
  await submit(page, page.getByRole("button", { name: "Ouvrir la séance" }), "Séance ouverte");
  const opened = await page.getByText(/Séance ouverte : \d+/).textContent();
  const [, eligible, quorum] = opened.match(/(\d+) membre\(s\) ont le droit de vote, quorum de (\d+)/).map(Number);
  log(`séance ouverte : ${eligible} votants possibles, quorum ${quorum}`);
  if (quorum < 3) throw new Error("il faut au moins 4 membres actifs majeurs pour ce test");
  await sign(page, 2);
  await page.getByText(`Il manque ${quorum - 2} votant(s)`).waitFor();
  if (!(await page.getByRole("button", { name: "Enregistrer le vote" }).first().isDisabled())) throw new Error("vote possible sans quorum");
  log("2 présents : quorum non atteint, vote impossible");
  await submit(page, page.getByRole("button", { name: "Constater la carence" }), "Carence constatée");
  await page.goto(`${ag1}/pv`);
  await page.getByRole("heading", { name: /Procès-verbal de carence/ }).waitFor();
  log("procès-verbal de carence établi");

  // 4. Deuxième convocation : délibère sans quorum
  await page.goto(ag1);
  await page.fill("#scheduledAt", inDays(35));
  await submit(page, page.getByRole("button", { name: "Préparer la deuxième AG" }), "Deuxième AG créée");
  const ag2 = page.url().split("?")[0];
  await page.getByText("deuxième convocation").first().waitFor();
  if ((await page.locator("li strong", { hasText: /^\d\. / }).count()) !== 2) throw new Error("résolutions non reprises");
  log("deuxième AG créée avec les mêmes résolutions");
  await submit(page, page.getByRole("button", { name: "Envoyer la convocation" }), "Convocation envoyée");
  await submit(page, page.getByRole("button", { name: "Ouvrir la séance" }), "Séance ouverte");
  await sign(page, 3);
  await page.getByText("Deuxième convocation : l'assemblée délibère").waitFor();
  log("3 présents : la deuxième AG peut délibérer");

  // 5. Votes
  const res = (n) => page.locator("li", { has: page.locator("strong", { hasText: new RegExp(`^${n}\\. `) }) });
  await page.locator("#pour-1").fill("5");
  await submit(page, res(1).getByRole("button", { name: "Enregistrer le vote" }), "Décompte incohérent");
  log("refus : plus de bulletins que de votants présents");
  await page.locator("#pour-1").fill("2");
  await page.locator("#contre-1").fill("1");
  await submit(page, res(1).getByRole("button", { name: "Enregistrer le vote" }), "Résolution 1 adoptée.");
  await page.locator("#pour-2").fill("2");
  await page.locator("#contre-2").fill("1");
  await submit(page, res(2).getByRole("button", { name: "Enregistrer le vote" }), "Résolution 2 adoptée.");
  await page.locator("#pour-2").fill("1");
  await page.locator("#contre-2").fill("1");
  await page.locator("#abstention-2").fill("1");
  await submit(page, res(2).getByRole("button", { name: "Corriger le vote" }), "Résolution 2 rejetée.");
  log("votes : majorité simple adoptée ; deux tiers 2/3 adoptée, puis corrigée 1/3 rejetée");

  // 6. Clôture et PV définitif
  await page.fill("#notes", "Aucune question diverse.");
  await submit(page, page.getByRole("button", { name: "Clôturer et établir le PV" }), "Séance clôturée");
  if (await page.getByRole("button", { name: /Émarger|Corriger le vote|Retirer/ }).count()) throw new Error("formulaires encore présents après clôture");
  await page.goto(`${ag2}/pv`);
  for (const t of ["sur deuxième convocation", "La résolution est adoptée.", "La résolution est rejetée.", "Aucune question diverse.", "Annexe : liste d'émargement (3)"]) {
    await page.getByText(t).first().waitFor();
  }
  if (await page.getByText("Projet de procès-verbal").count()) throw new Error("PV encore marqué comme projet");
  log("séance clôturée : PV définitif avec votes, observations et émargement");

  const id2 = ag2.split("/").pop();
  await member.goto(`${BASE}/membre/ag/${id2}`);
  await member.getByRole("heading", { name: /Procès-verbal/ }).waitFor();
  log("membre : procès-verbal consultable");

  await member.goto(`${BASE}/dirigeants/ag`);
  if (!member.url().endsWith("/membre")) throw new Error("un membre accède aux AG des dirigeants");
  log("membre simple redirigé hors de l'espace dirigeants");
} finally {
  await browser.close();
}
