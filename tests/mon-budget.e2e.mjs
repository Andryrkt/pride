// « Mon budget » (Apprendre › Mes pratiques) : revenus, dépenses, reste, parts par catégorie, objectif d'épargne,
// suppression, mois précédent, données visibles du membre seul.
// Prérequis : base avec « pnpm db:seed » et l'application lancée. Peut être relancé : le budget (fictif) du compte
// membre@pride.local est remis à zéro au début.
//   node tests/mon-budget.e2e.mjs
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
await db.connect();
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
  const { rows: [{ id: fanja }] } = await db.query(`select m.id from members m join "user" u on u.id = m.user_id where u.email = 'membre@pride.local'`);
  await db.query("delete from personal_budget_entries where member_id = $1", [fanja]);
  await db.query("delete from personal_budget_goals where member_id = $1", [fanja]);

  const page = await login("membre@pride.local");
  await page.getByRole("link", { name: "Apprendre" }).click();
  await page.getByRole("navigation", { name: "Apprendre" }).getByRole("link", { name: "Mes pratiques" }).click();
  await page.getByRole("navigation", { name: "Mes pratiques" }).getByRole("link", { name: "Mon budget" }).click();
  await page.waitForURL(`${BASE}/membre/mon-budget`);
  log("menu « Apprendre » → Mes pratiques → Mon budget");

  const add = async (category, amount, label = "") => {
    const form = page.locator("form", { has: page.locator("#budget-amount") });
    await page.selectOption("#budget-category", category);
    await page.fill("#budget-amount", amount);
    await page.fill("#budget-label", label);
    await form.getByRole("button", { name: "Ajouter" }).click();
  };
  await add("SALAIRE", "12,5");
  await page.getByText("Montant invalide").waitFor();
  await add("SALAIRE", "400 000");
  await page.getByText("Ligne ajoutée.").waitFor();
  await add("ALIMENTATION", "150000");
  await page.getByText("Lignes du mois (2)").waitFor();
  await add("TRANSPORT", "50000", `taxi-be ${stamp}`);
  await page.getByText("Lignes du mois (3)").waitFor();
  const card = (label) => page.getByText(label, { exact: true }).locator("..");
  for (const [label, value] of [["Revenus", "400 000 Ar"], ["Dépenses", "200 000 Ar"], ["Reste (épargne du mois)", "200 000 Ar"]]) {
    if (!(await card(label).innerText()).includes(value)) fail(`${label} : ${value} attendu`);
  }
  await page.getByText("150 000 Ar · 75 %").waitFor();
  log("montant invalide refusé ; revenus, dépenses, reste et part de l'alimentation (75 %)");

  const goal = page.locator("form", { has: page.locator("#goal") });
  await page.fill("#goal", "300000");
  await goal.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByText("67 %", { exact: true }).waitFor();
  await page.fill("#goal", "100000");
  await goal.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByText("Objectif atteint", { exact: true }).waitFor();
  log("objectif d'épargne : 67 %, puis atteint");

  await page.getByRole("button", { name: /Supprimer : Transport/ }).click();
  await page.getByText("Lignes du mois (2)").waitFor();
  if (!(await card("Dépenses").innerText()).includes("150 000 Ar")) fail("dépenses non recalculées après suppression");
  await page.getByRole("link", { name: "Mois précédent" }).click();
  await page.getByText("Lignes du mois (0)").waitFor();
  log("ligne supprimée, totaux recalculés ; mois précédent vide");

  const other = await login("admin@pride.local");
  await other.goto(`${BASE}/membre/mon-budget`);
  await other.getByRole("heading", { name: "Mon budget" }).waitFor();
  if (await other.getByText("150 000 Ar · ").count()) fail("un autre compte voit le budget du membre");
  log("un autre compte, même administrateur, ne voit pas ce budget");
} finally {
  await db.end();
  await browser.close();
}
