// Ressources de l'espace « Apprendre » : publication (Secrétaire générale), vidéo au clic, PDF réservé aux membres,
// vitrine publique, retrait (archive). Prérequis : base avec « pnpm db:seed » et l'application lancée. Peut être relancé.
//   node tests/ressources.e2e.mjs
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
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

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

async function publish(page, title, { video, vitrine }) {
  await page.goto(`${BASE}/membre/ressources`);
  await page.selectOption("#res-theme", "FINANCES");
  await page.fill("#res-title", title);
  await page.fill("#res-summary", "Résumé de test (fictif).");
  await page.fill("#res-body", "Première ligne.\nDeuxième ligne (fictif).");
  await page.fill("#res-video", video);
  await page.setInputFiles("#res-file", { name: "fiche.pdf", mimeType: "application/pdf", buffer: PDF });
  if (vitrine) await page.check("#res-vitrine");
  await page.getByRole("button", { name: "Publier la ressource" }).click();
}

try {
  const membre = await login("membre@pride.local");
  await membre.getByRole("link", { name: "Apprendre" }).click();
  await membre.getByRole("navigation", { name: "Apprendre" }).getByRole("link", { name: "Ressources" }).click();
  await membre.waitForURL(`${BASE}/membre/ressources`);
  if (await membre.getByRole("heading", { name: "Publier une ressource" }).count()) fail("un simple membre peut publier");
  log("membre : menu « Apprendre » → onglet Ressources, sans publication");

  // Un responsable de la Commission formation et projets peut publier
  const { rows: [{ id: fanja }] } = await db.query(`select m.id from members m join "user" u on u.id = m.user_id where u.email = 'membre@pride.local'`);
  const { rows: [{ id: resp }] } = await db.query(
    `insert into mandates (member_id, role, commission_id, starts_at) select $1, 'RESPONSABLE_COMMISSION', id, current_date from commissions where slug = 'formation-projets' returning id`,
    [fanja],
  );
  try {
    await membre.reload();
    await membre.getByRole("heading", { name: "Publier une ressource" }).waitFor();
  } finally {
    await db.query("delete from mandates where id = $1", [resp]);
  }
  log("responsable de la Commission formation et projets : peut publier");

  const sg = await login("secretaire@pride.local");
  const title = `Tenir son budget ${stamp}`;
  await publish(sg, title, { video: "https://vimeo.com/123", vitrine: false });
  await sg.getByText("Lien vidéo non reconnu").waitFor();
  await publish(sg, title, { video: "https://youtu.be/dQw4w9WgXcQ", vitrine: false });
  await sg.getByText("Ressource publiée.").waitFor();
  const id = sg.url().split("/membre/ressources/")[1].split("?")[0];
  log("Secrétaire générale : lien non YouTube refusé, ressource publiée");

  await membre.goto(`${BASE}/membre/ressources/${id}`);
  await membre.getByText("Réservée aux membres").waitFor();
  if (await membre.locator("iframe").count()) fail("la vidéo se charge sans clic");
  await membre.getByRole("button", { name: /Lire la vidéo/ }).click();
  await membre.locator('iframe[src^="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]').waitFor();
  const pdf = await membre.request.get(`${BASE}/api/ressources/${id}`);
  if (pdf.status() !== 200 || pdf.headers()["content-type"] !== "application/pdf") fail(`PDF membre : ${pdf.status()}`);
  const anon = await (await browser.newContext()).request.get(`${BASE}/api/ressources/${id}`);
  if (anon.status() !== 404) fail(`PDF accessible sans compte : ${anon.status()}`);
  const pub = await browser.newPage();
  await pub.goto(`${BASE}/ressources`);
  if (await pub.getByText(title).count()) fail("une ressource réservée aux membres apparaît sur le site public");
  log("membre : vidéo chargée au clic, PDF téléchargé ; caché du public");

  const vitrine = `Épargner chaque mois ${stamp}`;
  await publish(sg, vitrine, { video: "", vitrine: true });
  await sg.getByText("Ressource publiée.").waitFor();
  await pub.goto(`${BASE}/ressources?theme=FINANCES`);
  await pub.getByRole("link", { name: vitrine }).click();
  await pub.getByText("Vitrine publique").first().waitFor();
  log("vitrine : visible sur le site public");

  await sg.getByRole("link", { name: "Modifier" }).click();
  await sg.fill("#res-title", `${vitrine} (modifiée)`);
  await sg.uncheck("#res-vitrine");
  await sg.check("#res-remove-pdf");
  await sg.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await sg.getByText("Ressource modifiée.").waitFor();
  await sg.getByRole("heading", { name: `${vitrine} (modifiée)` }).waitFor();
  if (await sg.getByText("Télécharger le PDF").count()) fail("la fiche PDF n'a pas été retirée");
  await pub.goto(`${BASE}/ressources`);
  if (await pub.getByText(vitrine).count()) fail("une ressource sortie de la vitrine reste publique");
  log("modification : titre changé, vitrine et PDF retirés");

  await sg.getByRole("button", { name: "Retirer cette ressource" }).click();
  await sg.getByText("Ressource retirée (archivée).").waitFor();
  await pub.goto(`${BASE}/ressources`);
  if (await pub.getByText(vitrine).count()) fail("une ressource retirée reste en vitrine");
  log("retrait : ressource archivée, plus visible");
} finally {
  // Les ressources de test sont archivées (jamais supprimées, comme dans l'application).
  await db.query(`update resources set archived_at = now() where archived_at is null and title like $1`, [`%${stamp}%`]);
  await db.end();
  await browser.close();
}
