// Captures d'écran des guides (apps/web/public/aide/<guide>), prises sur les données de démonstration (fictives).
// À relancer quand l'interface change : node tests/captures-aide.mjs   (site lancé, base avec démo)
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const dir = (guide) => decodeURIComponent(new URL(`../apps/web/public/aide/${guide}/`, import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
for (const g of ["candidats", "membres", "dirigeants"]) await mkdir(dir(g), { recursive: true });

async function session(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(120_000);
  // L'indicateur de développement de Next.js n'existe pas en production : on le masque sur les captures.
  await ctx.addInitScript(() => document.addEventListener("DOMContentLoaded", () => document.head.insertAdjacentHTML("beforeend", "<style>nextjs-portal{display:none!important}</style>")));
  const page = await ctx.newPage();
  if (email) {
    await page.goto(`${BASE}/connexion`);
    await page.fill("#email", email);
    await page.fill("#password", "PrideDemo2026!");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(`${BASE}/membre`);
  }
  const shot = async (guide, name, target = page) => {
    await page.waitForLoadState("networkidle");
    await target.screenshot({ path: dir(guide) + name });
    console.log("✔", `${guide}/${name}`);
  };
  return { page, shot };
}

// --- Candidats (sans connexion) ------------------------------------------------
{
  const { page, shot } = await session();
  await page.goto(`${BASE}/adhesion`);
  await shot("candidats", "candidature-1.png");
  await page.locator("#candidature").scrollIntoViewIfNeeded();
  await page.getByText("Pièces du dossier").scrollIntoViewIfNeeded();
  await shot("candidats", "candidature-2.png");
  await page.close();
}

// --- Membres ---------------------------------------------------------------------
{
  const { page, shot } = await session();
  await page.goto(`${BASE}/connexion`);
  await shot("membres", "connexion-1.png");
  await page.close();
}
{
  const { page, shot } = await session("membre@pride.local");
  await page.goto(`${BASE}/membre/cotisations`);
  await shot("membres", "cotisations-1.png");
  // Photo : illustration neutre, pas de vrai visage
  const silhouette = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#cfe3d7"/><circle cx="300" cy="300" r="140" fill="#146b47"/><path d="M80 800c0-170 100-280 220-280s220 110 220 280z" fill="#146b47"/></svg>`,
  );
  await page.goto(`${BASE}/membre/profil`);
  await page.setInputFiles("#photo", { name: "illustration.png", mimeType: "image/png", buffer: await sharp(silhouette).png().toBuffer() });
  await page.getByRole("button", { name: "Enregistrer la photo" }).click();
  await page.getByText("Photo enregistrée").waitFor();
  await shot("membres", "carte-1.png", page.locator("main form").first());
  await shot("membres", "profil-1.png", page.locator("main form").nth(1));
  await page.goto(`${BASE}/membre`);
  await page.getByRole("img", { name: "Ma photo" }).waitFor();
  await shot("membres", "carte-2.png");
  await page.goto(`${BASE}/membre/formations`);
  await shot("membres", "formations-1.png");
  await page.goto(`${BASE}/membre/formations?vue=offres`);
  await shot("membres", "offres-1.png");
  await page.goto(`${BASE}/membre/competences`);
  await shot("membres", "commissions-1.png");
  await page.goto(`${BASE}/membre`);
  await page.locator("#solidarite").getByRole("button", { name: "Déclarer un événement" }).click();
  await shot("membres", "solidarite-1.png", page.locator("#solidarite"));
  await page.goto(`${BASE}/membre/messages`);
  await shot("membres", "messagerie-1.png");
  await page.goto(`${BASE}/membre/ag`);
  await page.locator("#consultations").scrollIntoViewIfNeeded();
  await shot("membres", "ag-1.png");
  await page.close();
}

// --- Dirigeants ------------------------------------------------------------------
{
  const { page, shot } = await session("admin@pride.local");
  await page.goto(`${BASE}/dirigeants`);
  await shot("dirigeants", "espace-1.png");
  await page.goto(`${BASE}/dirigeants/adhesions`);
  await page.getByRole("link", { name: /^C-/ }).first().click();
  await page.waitForURL(/adhesions\/.+/);
  await shot("dirigeants", "adhesions-1.png");
  await page.goto(`${BASE}/dirigeants/membres`);
  await shot("dirigeants", "registre-1.png");
  await page.goto(`${BASE}/dirigeants/ag`);
  await shot("dirigeants", "ag-1.png");
  await page.getByRole("heading", { name: "Consultations en ligne" }).scrollIntoViewIfNeeded();
  await shot("dirigeants", "consultations-1.png");
  await page.goto(`${BASE}/dirigeants/actualites`);
  await shot("dirigeants", "publier-1.png");
  await page.goto(`${BASE}/dirigeants/commissions/communication`);
  await shot("dirigeants", "commissions-1.png");
  await page.goto(`${BASE}/dirigeants/solidarite`);
  await shot("dirigeants", "solidarite-1.png");
  await page.goto(`${BASE}/dirigeants/messages`);
  await shot("dirigeants", "messagerie-1.png");
  await page.close();
}

await browser.close();
