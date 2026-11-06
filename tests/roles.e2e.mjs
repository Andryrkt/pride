// Rôles : seul l'administrateur attribue ou retire les rôles de dirigeant et d'administrateur ; poste unique remplacé ; il désigne aussi le comptable.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/roles.e2e.mjs
import { chromium } from "playwright";
import pg from "pg";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://pride:pride@localhost:5432/pride" });
await db.connect();
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };
const started = new Date();

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
const memberId = async (email) => (await db.query(`select m.id from members m join "user" u on u.id = m.user_id where u.email = $1`, [email])).rows[0].id;
const ids = [];

try {
  const fanja = await memberId("membre@pride.local");
  const comptable = await memberId("comptable@pride.local");
  ids.push(fanja, comptable);

  const ca = await login("ca@pride.local");
  await ca.goto(`${BASE}/dirigeants/membres/${fanja}`);
  await ca.getByRole("heading", { name: "Mandats" }).waitFor();
  if (await ca.getByRole("heading", { name: "Rôles de dirigeant" }).count()) fail("un membre du CA voit l'attribution des rôles");
  log("CA : pas d'attribution des rôles");

  const admin = await login("admin@pride.local");
  const fiche = async (id) => {
    await admin.goto(`${BASE}/dirigeants/membres/${id}`);
    await admin.getByRole("heading", { name: "Rôles de dirigeant" }).waitFor();
  };
  const appoint = async (role) => {
    await admin.selectOption("#leader-role", role);
    await admin.getByRole("button", { name: "Attribuer le rôle" }).click();
  };

  // Conseiller : le membre accède à l'espace dirigeants, puis le perd quand le rôle est retiré
  await fiche(fanja);
  await appoint("CONSEILLER");
  await admin.getByText("Rôle attribué : Conseiller d'administration.").waitFor();
  const membre = await login("membre@pride.local");
  await membre.goto(`${BASE}/dirigeants`);
  if (!membre.url().endsWith("/dirigeants")) fail("le conseiller n'accède pas à l'espace dirigeants");
  log("administrateur : rôle de conseiller attribué, accès à l'espace dirigeants");
  await appoint("CONSEILLER");
  await admin.getByText("Ce membre a déjà ce rôle à cette date.").waitFor();
  await admin.getByRole("button", { name: "Retirer ce rôle" }).click();
  await admin.getByText("Rôle retiré : Conseiller d'administration.").waitFor();
  await membre.goto(`${BASE}/dirigeants`);
  await membre.waitForURL(`${BASE}/membre`);
  log("doublon refusé ; rôle retiré, accès fermé");

  // Poste unique : le nouveau Trésorier remplace le précédent
  await appoint("TRESORIER");
  await admin.getByText("Rôle attribué : Trésorier.").waitFor();
  await fiche(comptable);
  if (!(await admin.locator("#leader-role option", { hasText: /Trésorier \(actuel : / }).count())) fail("le titulaire actuel n'est pas indiqué");
  await appoint("TRESORIER");
  await admin.getByText(/Le mandat du titulaire précédent se termine la veille/).waitFor();
  const { rows } = await db.query(`select member_id, ends_at < starts_at as annule from mandates where role = 'TRESORIER' and member_id = any($1) and created_at >= $2`, [ids, started]);
  if (!rows.find((r) => r.member_id === fanja)?.annule) fail("le mandat du Trésorier précédent n'est pas terminé");
  log("poste unique : le Trésorier précédent est remplacé");

  // Un autre administrateur, sans date de fin, que l'on peut retirer (le premier compte reste administrateur)
  await fiche(fanja);
  await appoint("ADMIN_TECHNIQUE");
  await admin.getByText("Rôle attribué : Administrateur du site.").waitFor();
  await admin.getByText(/\(sans fin\)/).first().waitFor();
  await admin.getByRole("button", { name: "Retirer ce rôle" }).click();
  await admin.getByText("Rôle retiré : Administrateur du site.").waitFor();
  log("administrateur : nomination d'un autre administrateur, puis retrait");

  // Comptable : l'administrateur peut aussi le désigner
  await admin.getByRole("button", { name: "Désigner comme comptable" }).waitFor();
  log("administrateur : désignation du comptable possible");
} finally {
  // Les données de démonstration restent comme avant le test.
  await db.query(`delete from mandates where role in ('CONSEILLER', 'TRESORIER', 'ADMIN_TECHNIQUE') and member_id = any($1) and created_at >= $2`, [ids, started]);
  await db.end();
  await browser.close();
}
