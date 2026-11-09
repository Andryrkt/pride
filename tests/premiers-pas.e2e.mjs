// Guides de démarrage : « Vos premiers pas » sur le tableau de bord du membre (étapes cochées d'après sa fiche, « Masquer ce guide »),
// « Bienvenue dans l'espace dirigeants » pour un dirigeant ; pas de guide membre sur la fiche technique de l'administrateur.
// Prérequis : base avec « pnpm db:seed » et l'application lancée. Remet à zéro les guides de membre@ et ca@pride.local. Peut être relancé.
//   node tests/premiers-pas.e2e.mjs
import pg from "pg";
import { chromium, request } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });

async function session(email) {
  const ctx = await request.newContext({ baseURL: BASE, timeout: 240_000, extraHTTPHeaders: { Origin: BASE } });
  const r = await ctx.post("/api/auth/sign-in/email", { data: { email, password: "PrideDemo2026!" } });
  if (!r.ok()) fail(`connexion de ${email} : ${r.status()}`);
  return ctx;
}

await db.connect();
await db.query(`UPDATE members SET onboarding_member_done_at = NULL, onboarding_leader_done_at = NULL WHERE email IN ('membre@pride.local', 'ca@pride.local')`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const [ca, admin] = [await session("ca@pride.local"), await session("admin@pride.local")];
try {
  if (!(await (await ca.get("/dirigeants")).text()).includes("Bienvenue dans l&#x27;espace dirigeants")) fail("pas de guide pour le dirigeant");
  log("dirigeant : « Bienvenue dans l'espace dirigeants »");
  const adminHome = await (await admin.get("/membre")).text();
  if (adminHome.includes("premiers pas") || adminHome.includes("Votre espace est prêt")) fail("guide membre affiché sur la fiche technique");
  log("fiche technique de l'administrateur : pas de guide membre");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(240_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", "membre@pride.local");
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);
  await page.getByRole("progressbar", { name: "Premiers pas" }).waitFor();
  const { rows: [m] } = await db.query(`SELECT photo_key, phone, address FROM members WHERE email = 'membre@pride.local'`);
  const photo = page.locator("li", { hasText: "Ajoutez votre photo d'identité" });
  if ((await photo.getByLabel("Fait").count()) !== (m.photo_key ? 1 : 0)) fail("étape « photo » mal cochée");
  log("membre : premiers pas affichés, étapes cochées d'après la fiche");

  await page.getByRole("button", { name: "Masquer ce guide" }).click();
  await page.getByRole("progressbar", { name: "Premiers pas" }).waitFor({ state: "detached" });
  await page.reload();
  if (await page.getByRole("progressbar", { name: "Premiers pas" }).count()) fail("le guide revient après « Masquer »");
  log("« Masquer ce guide » : il ne revient plus");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await Promise.all([ca.dispose(), admin.dispose(), db.end()]);
  await browser.close();
}
