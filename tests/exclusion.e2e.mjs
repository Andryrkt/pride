// Fin de la qualité de membre : procédure d'exclusion (motif, audition, délibération du CA aux 2/3 des présents),
// exclusion non retenue, démission ; effets : carte invalide, sortie des commissions.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
// Crée à chaque passage trois membres fictifs directement en base (DATABASE_URL, par défaut la base locale).
//   node tests/exclusion.e2e.mjs        (dure environ 2 min : on attend l'heure de l'audition)
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const run = Date.now().toString(36).toUpperCase();

async function fictiveMember(suffix) {
  const { rows } = await db.query(
    `insert into members (number, last_name, first_names, joined_at) values ($1, $2, 'Test (fictif)', now()) returning id`,
    [`TEST${run}${suffix}`, `EXCLUSION-${suffix}-${run}`],
  );
  return rows[0].id;
}
const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

try {
  await db.connect();
  const [excluded, kept, resigned] = [await fictiveMember("A"), await fictiveMember("B"), await fictiveMember("C")];
  const { rows: [com] } = await db.query("select id from commissions where slug = 'sociale'");
  await db.query("insert into commission_memberships (member_id, commission_id) values ($1, $2)", [excluded, com.id]);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(120_000);
  const admin = await ctx.newPage();
  await admin.goto(`${BASE}/connexion`);
  await admin.fill("#email", "admin@pride.local");
  await admin.fill("#password", "PrideDemo2026!");
  await admin.getByRole("button", { name: "Se connecter" }).click();
  await admin.waitForURL(`${BASE}/membre`);

  // 1. Ouverture des deux procédures (audition une minute et demie après la saisie)
  let hearing = "";
  for (const id of [excluded, kept]) {
    await admin.goto(`${BASE}/dirigeants/membres/${id}`);
    await admin.getByLabel("Motif").fill("Motif fictif du test automatique.");
    hearing = local(new Date(Date.now() + 90_000));
    await admin.getByLabel("Date de l'audition").fill(hearing);
    await admin.getByRole("button", { name: "Ouvrir la procédure" }).click();
    await admin.getByText("Procédure ouverte").waitFor();
  }
  log("procédures ouvertes, membres convoqués");

  // 2. Délibération impossible avant l'audition
  const deliberate = async (presents, pour, contre) => {
    await admin.getByLabel("Membres du CA présents").fill(String(presents));
    await admin.getByLabel("Pour l'exclusion").fill(String(pour));
    await admin.getByLabel("Contre").fill(String(contre));
    await admin.getByLabel("Défense présentée par le membre").fill("Défense fictive.");
    await admin.locator('input[name="heard"]').check();
    await admin.getByRole("button", { name: "Enregistrer la délibération" }).click();
  };
  await deliberate(6, 4, 2);
  await admin.getByText("le membre doit avoir pu se défendre").waitFor();
  log("délibération refusée avant l'audition");

  await new Promise((r) => setTimeout(r, Math.max(0, new Date(hearing).getTime() + 62_000 - Date.now())));

  // 3. 4 voix sur 6 présents = deux tiers : exclusion
  await admin.goto(`${BASE}/dirigeants/membres/${excluded}`);
  await deliberate(6, 4, 2);
  await admin.getByText("Exclusion prononcée").first().waitFor();
  const { rows: [a] } = await db.query("select status from members where id = $1", [excluded]);
  if (a.status !== "EXCLU") fail(`statut inattendu : ${a.status}`);
  const { rows: coms } = await db.query("select 1 from commission_memberships where member_id = $1", [excluded]);
  if (coms.length) fail("le membre exclu est resté dans sa commission");
  const visitor = await browser.newPage();
  await visitor.goto(`${BASE}/verifier/${excluded}`);
  await visitor.getByText("Carte non valide").waitFor();
  log("4 / 6 : exclusion prononcée, sortie de la commission, carte non valide");

  // 4. 3 voix sur 6 présents : moins des deux tiers, le membre reste
  await admin.goto(`${BASE}/dirigeants/membres/${kept}`);
  await deliberate(6, 3, 3);
  await admin.getByText("Deux tiers des présents non atteints").waitFor();
  const { rows: [b] } = await db.query("select status from members where id = $1", [kept]);
  if (b.status !== "ACTIF") fail("membre exclu sans les deux tiers");
  log("3 / 6 : exclusion non retenue, le membre reste actif");

  // 5. Démission
  await admin.goto(`${BASE}/dirigeants/membres/${resigned}`);
  await admin.getByLabel("Note", { exact: true }).first().fill("Lettre fictive.");
  await admin.getByRole("button", { name: "Enregistrer la démission" }).click();
  await admin.getByText("Démission enregistrée").waitFor();
  await admin.goto(`${BASE}/dirigeants/membres?q=EXCLUSION-C-${run}`);
  await admin.getByText("Démissionnaire").waitFor();
  log("démission enregistrée et visible au registre");

  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
  await browser.close();
}
