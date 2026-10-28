// Budget annuel : préparation (comptable pour le général, responsable pour sa commission), adoption par le CA,
// verrouillage, imputation d'une dépense avec avertissement de dépassement, suivi et export CSV.
// Prérequis : base avec « pnpm db:seed » et l'application lancée. Travaille sur le budget de l'année en cours
// (un rectificatif à chaque passage) ; donne un instant au compte membre@pride.local la responsabilité d'une commission. Peut être relancé.
//   node tests/budget.e2e.mjs
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36).toUpperCase();
const year = new Date().getFullYear();
let leaderMandate;
let piece;

async function login(email, landing) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", email);
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}${landing}`);
  return page;
}
async function addLine(page, account, amount, label) {
  const form = page.locator("form", { has: page.getByRole("button", { name: "Enregistrer la ligne" }) });
  await form.getByLabel("Compte").selectOption(account);
  await form.getByLabel("Description").fill(label);
  await form.getByLabel("Montant prévu (Ar)").fill(String(amount));
  await form.getByRole("button", { name: "Enregistrer la ligne" }).click();
  await form.getByText(/Ligne (ajoutée|mise à jour)/).waitFor();
}

try {
  await db.connect();
  // Un brouillon laissé par un passage interrompu est retiré (un brouillon n'engage rien).
  await db.query("delete from budget_lines where budget_id in (select id from budgets where status = 'BROUILLON' and year = $1)", [year]);
  await db.query("delete from budgets where status = 'BROUILLON' and year = $1", [year]);
  const { rows: [{ id: commissionId, name: commissionName }] } = await db.query("select id, name from commissions where slug = 'formation-projets'");
  const { rows: [{ id: fanjaId }] } = await db.query(`select m.id from members m join "user" u on u.id = m.user_id where u.email = 'membre@pride.local'`);
  leaderMandate = (await db.query("insert into mandates (member_id, role, commission_id, starts_at) values ($1, 'RESPONSABLE_COMMISSION', $2, current_date) returning id", [fanjaId, commissionId])).rows[0].id;
  const { rows: [{ v: previous }] } = await db.query("select max(version) as v from budgets where year = $1 and status = 'ADOPTE'", [year]);

  // 1. Le comptable ouvre la préparation et saisit des lignes générales ; il ne peut pas adopter
  const comptable = await login("comptable@pride.local", "/finances");
  await comptable.goto(`${BASE}/finances/budget?annee=${year}`);
  await comptable.getByRole("button", { name: new RegExp(`Préparer (le budget|un budget rectificatif) ${year}`) }).click();
  await comptable.getByText(/en préparation/).first().waitFor();
  await addLine(comptable, "FONCTIONNEMENT", 30000, `Fournitures ${run} (fictif)`);
  await addLine(comptable, "COTISATIONS", 1200000, "Cotisations attendues (fictif)");
  if (await comptable.getByRole("button", { name: "Adopter le budget" }).count()) fail("le comptable peut adopter le budget");
  log("comptable : brouillon ouvert, lignes générales saisies, adoption refusée");

  // 2. Le responsable de commission saisit la ligne de sa commission, et seulement de sa commission
  const leader = await login("membre@pride.local", "/membre");
  await leader.getByRole("link", { name: "Budget de ma commission" }).click();
  await leader.waitForURL(/\/membre\/budget/);
  const options = await leader.getByLabel("Commission").locator("option").allTextContents();
  if (options.join() !== commissionName) fail(`commissions proposées au responsable : ${options.join(", ")}`);
  await addLine(leader, "ACTIVITES_DEPENSES", 200000, `Ateliers ${run} (fictif)`);
  await addLine(leader, "ACTIVITES_RECETTES", 150000, `Participations des non-membres ${run} (fictif)`);
  if (await leader.getByText(`Fournitures ${run}`).count()) fail("le responsable voit les lignes générales du brouillon");
  log("responsable de commission : ligne de sa commission saisie, rien d'autre");

  // 3. Adoption par le CA (administrateur) : verrouillage, l'ancienne version est remplacée
  const admin = await login("admin@pride.local", "/membre");
  await admin.goto(`${BASE}/finances/budget?annee=${year}`);
  await admin.getByRole("button", { name: "Adopter le budget" }).click();
  await admin.getByText(/adopté : il est maintenant verrouillé/).waitFor();
  const { rows: versions } = await db.query("select version, status from budgets where year = $1 order by version", [year]);
  if (versions.filter((b) => b.status === "ADOPTE").length !== 1 || versions.at(-1).status !== "ADOPTE") fail(`versions : ${JSON.stringify(versions)}`);
  if (previous && versions.find((b) => b.version === previous).status !== "REMPLACE") fail("l'ancien budget n'est pas « remplacé »");
  if (await admin.getByRole("button", { name: "Enregistrer la ligne" }).count()) fail("un budget adopté reste modifiable");
  await admin.locator("tr", { hasText: `Ateliers ${run}` }).getByText(commissionName).waitFor();
  log("CA : budget adopté et verrouillé", previous ? `(rectificatif de la version ${previous})` : "");

  // 4. Dépense imputée à une ligne : avertissement de dépassement, engagé visible dans le suivi
  await comptable.goto(`${BASE}/finances/depenses`);
  const form = comptable.locator("form", { has: comptable.getByLabel("Objet de la dépense") });
  const SUPPLY = `Ramettes ${run} (fictif)`;
  await form.getByLabel("Objet de la dépense").fill(SUPPLY);
  await form.getByLabel("Imputation (ligne du budget)").selectOption({ label: `Fonctionnement (fournitures, communication, transport) · Général · Fournitures ${run} (fictif)` });
  await form.getByLabel("Montant (Ar)").fill("45000");
  await form.getByRole("button", { name: "Préparer la pièce" }).click();
  await comptable.getByText(/la ligne du budget est dépassée de/).waitFor();
  piece = (await db.query("select id, budget_line_id from expenses where label = $1", [SUPPLY])).rows[0];
  if (!piece.budget_line_id) fail("pièce non imputée");
  await comptable.locator("article", { hasText: SUPPLY }).getByText(/dépassement de/).waitFor();
  await comptable.goto(`${BASE}/finances/budget?annee=${year}`);
  await comptable.locator("tr", { hasText: `Fournitures ${run}` }).getByText("45 000", { exact: false }).first().waitFor();
  log("dépense imputée : avertissement de dépassement, engagé dans le suivi");

  // 5. Recette d'une formation rattachée à la commission : réalisé sur sa ligne, annulé par une rectification
  const FEES = `Formation ${run} : 4 participations de non-membres (fictif)`;
  await comptable.goto(`${BASE}/finances/journal`);
  const entry = comptable.locator("form", { has: comptable.getByRole("button", { name: "Enregistrer la recette" }) });
  await entry.getByLabel("Libellé").fill(FEES);
  await entry.getByLabel("Compte").selectOption("ACTIVITES_RECETTES");
  await entry.getByLabel("Commission").selectOption({ label: commissionName });
  await entry.getByLabel("Montant (Ar)").fill("40000");
  await entry.getByRole("button", { name: "Enregistrer la recette" }).click();
  await entry.getByText(/Recette enregistrée/).waitFor();
  const feesRow = (p) => p.locator("tr", { hasText: `Participations des non-membres ${run}` });
  await leader.goto(`${BASE}/membre/budget?annee=${year}`);
  await feesRow(leader).getByText("40 000", { exact: false }).first().waitFor();
  const row = comptable.locator("tr", { hasText: FEES });
  await row.getByText("Rectifier").click();
  await row.getByLabel("Motif").fill("doublon (test)");
  await row.getByRole("button", { name: "Enregistrer la rectification" }).click();
  await comptable.locator("tr", { hasText: FEES }).getByText("Rectifiée").waitFor();
  const { rows: fees } = await db.query("select commission_id from ledger_entries where label = $1 or corrects_id = (select id from ledger_entries where label = $1)", [FEES]);
  if (fees.length !== 2 || fees.some((f) => f.commission_id !== commissionId)) fail("recette ou rectification sans la commission");
  await leader.reload();
  if ((await feesRow(leader).locator("td").nth(2).textContent()).replace(/\s/g, "") !== "0Ar") fail("réalisé de la commission non annulé par la rectification");
  log("recette de formation rattachée à la commission : réalisé sur sa ligne, annulé par la rectification");

  // 6. Export CSV du suivi
  await comptable.goto(`${BASE}/finances/budget?annee=${year}`);
  const [download] = await Promise.all([comptable.waitForEvent("download"), comptable.getByRole("link", { name: "Exporter le suivi (CSV)" }).click()]);
  const csv = await readFile(await download.path(), "utf8");
  if (!csv.includes(`Ateliers ${run}`) || !csv.includes("Prévu (Ar)")) fail("export CSV du budget incomplet");
  log("export CSV :", download.suggestedFilename());

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  // La pièce de test n'est pas payée : on la classe « rejetée » pour ne pas encombrer les dépenses en cours.
  if (piece) await db.query("update expenses set status = 'REJETEE', reject_reason = 'test' where id = $1", [piece.id]);
  if (leaderMandate) await db.query("delete from mandates where id = $1", [leaderMandate]);
  await db.end();
  await browser.close();
}
