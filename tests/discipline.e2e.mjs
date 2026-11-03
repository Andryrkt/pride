// Autodiscipline : habitudes (limite de 3), objectifs, bilan au choix par jour ou par semaine, confidentialité entre membres.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/discipline.e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const stamp = Date.now().toString(36);

async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/membre/);
  return page;
}

try {
  const page = await login("membre@pride.local");
  await page.goto(`${BASE}/membre/discipline`);

  // Repartir sans habitude en cours
  while (await page.getByRole("button", { name: "Arrêter" }).count()) {
    const before = await page.getByRole("button", { name: "Arrêter" }).count();
    await page.getByRole("button", { name: "Arrêter" }).first().click();
    await page.waitForFunction((n) => [...document.querySelectorAll("button")].filter((b) => b.textContent === "Arrêter").length < n, before);
  }
  await page.getByText("Commencez petit").waitFor();
  log("sans habitude : invitation à commencer petit");

  const add = async (title, expected) => {
    await page.fill("#habit-title", title);
    await page.getByRole("button", { name: "Ajouter l'habitude" }).click();
    await page.getByText(title, { exact: true }).waitFor();
    if ((await page.locator("li strong.text-\\[17px\\]").count()) !== expected) fail(`${expected} habitude(s) attendue(s)`);
  };
  await add(`Lire ${stamp}`, 1);
  await add(`Marcher ${stamp}`, 2);
  await add(`Écrire ${stamp}`, 3);
  await page.getByText("3 habitudes au maximum").waitFor();
  if (await page.locator("#habit-title").count()) fail("formulaire encore présent à 3 habitudes");
  log("3 habitudes : limite atteinte, formulaire retiré");

  const habit = page.locator("li", { hasText: `Lire ${stamp}` });
  await habit.getByRole("button", { name: "Fait aujourd'hui", exact: true }).click();
  await habit.getByText("1 jour d'affilée").waitFor();
  await habit.getByRole("button", { name: "Fait hier aussi" }).click();
  await habit.getByText("2 jours d'affilée").waitFor();
  log("cases du jour et de la veille : série de 2 jours");
  await habit.getByRole("button", { name: /annuler/ }).click();
  await habit.getByText("1 jour d'affilée").waitFor();
  log("annulation : la veille compte toujours tant que la journée n'est pas finie");

  await page.fill("#goal-title", `Objectif ${stamp}`);
  await page.getByRole("button", { name: "Ajouter l'objectif" }).click();
  const goal = page.locator("li", { hasText: `Objectif ${stamp}` });
  await goal.getByRole("button", { name: "Atteint" }).click();
  await goal.locator("span", { hasText: /^Atteint$/ }).waitFor();
  log("objectif ajouté puis atteint");

  await page.getByRole("link", { name: "Aujourd'hui" }).click();
  await page.getByLabel("Qu'est-ce qui a marché aujourd'hui ?").fill(`Bilan du jour ${stamp}`);
  await page.getByRole("button", { name: "Enregistrer le bilan" }).click();
  await page.getByText("Bilan enregistré.").waitFor();
  await page.goto(`${BASE}/membre/discipline?bilan=semaine`);
  if ((await page.getByLabel("Qu'est-ce qui a marché cette semaine ?").inputValue()).includes(stamp)) fail("le bilan du jour apparaît dans la semaine");
  await page.getByLabel("Ma priorité pour la semaine prochaine").fill(`Priorité ${stamp}`);
  await page.getByRole("button", { name: "Enregistrer le bilan" }).click();
  await page.getByText("Bilan enregistré.").waitFor();
  await page.goto(`${BASE}/membre/discipline?bilan=jour`);
  if ((await page.getByLabel("Qu'est-ce qui a marché aujourd'hui ?").inputValue()) !== `Bilan du jour ${stamp}`) fail("bilan du jour perdu");
  await page.getByText(`Priorité ${stamp}`).waitFor({ state: "attached" });
  log("bilans du jour et de la semaine enregistrés séparément");

  await page.goto(`${BASE}/membre`);
  await page.getByText("0 habitude(s) sur 3 faite(s) aujourd'hui").waitFor();
  log("tableau de bord : résumé du jour");

  const other = await login("admin@pride.local");
  await other.goto(`${BASE}/membre/discipline`);
  if ((await other.content()).includes(stamp)) fail("un autre compte voit ces données");
  log("un autre compte, même administrateur, ne voit pas ces données");
} finally {
  await browser.close();
}
