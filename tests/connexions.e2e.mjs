// Page « Connexions » (administrateur seul) : le membre connecté apparaît « en ligne », l'administrateur le déconnecte,
// le membre revient à la page de connexion ; page refusée à la Secrétaire générale.
// Prérequis : base avec « pnpm db:seed » et l'application lancée. Peut être relancé.
//   node tests/connexions.e2e.mjs
import { chromium, request } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };

/** Session ouverte par l'API de connexion, sans navigateur. */
async function session(email) {
  const ctx = await request.newContext({ baseURL: BASE, timeout: 240_000, maxRedirects: 0, extraHTTPHeaders: { Origin: BASE, "User-Agent": "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36" } });
  const r = await ctx.post("/api/auth/sign-in/email", { data: { email, password: "PrideDemo2026!" } });
  if (!r.ok()) fail(`connexion de ${email} : ${r.status()}`);
  return ctx;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const member = await session("membre@pride.local");
const sg = await session("secretaire@pride.local");
try {
  if ((await member.get("/membre")).status() !== 200) fail("le membre n'accède pas à son espace");
  const s = await sg.get("/dirigeants/connexions");
  if (s.status() !== 307 || !s.headers().location?.endsWith("/dirigeants")) fail(`Secrétaire générale : ${s.status()} au lieu d'un renvoi`);
  log("page refusée à la Secrétaire générale");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.setDefaultTimeout(240_000);
  const admin = await ctx.newPage();
  await admin.goto(`${BASE}/connexion`);
  await admin.fill("#email", "admin@pride.local");
  await admin.fill("#password", "PrideDemo2026!");
  await admin.getByRole("button", { name: "Se connecter" }).click();
  await admin.waitForURL(`${BASE}/membre`);
  await admin.goto(`${BASE}/dirigeants/connexions`);
  const row = admin.locator("li", { hasText: "membre@pride.local" }).filter({ hasText: "Chrome sur Android" }).first();
  await row.getByText("En ligne").waitFor();
  log("membre connecté visible « en ligne », avec son appareil");

  await row.getByRole("button", { name: "Déconnecter" }).click();
  await admin.getByText("l'utilisateur est déconnecté").waitFor();
  const after = await member.get("/membre");
  if (after.status() !== 307 || !after.headers().location?.includes("/connexion")) fail(`membre encore connecté : ${after.status()}`);
  log("déconnecté par l'administrateur : le membre revient à la page de connexion");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await Promise.all([member.dispose(), sg.dispose()]);
  await browser.close();
}
