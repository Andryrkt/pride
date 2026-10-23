// Captures d'écran du guide des membres (apps/web/public/aide/membres), prises sur les données de démonstration (fictives).
// À relancer quand l'interface change : node tests/captures-aide.mjs   (site lancé, base avec démo)
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("../apps/web/public/aide/membres/", import.meta.url);
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
await mkdir(OUT, { recursive: true });
const file = (name) => decodeURIComponent(new URL(name, OUT).pathname).replace(/^\/([A-Z]:)/, "$1");

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
ctx.setDefaultTimeout(120_000);
// L'indicateur de développement de Next.js n'existe pas en production : on le masque sur les captures.
await ctx.addInitScript(() => document.addEventListener("DOMContentLoaded", () => document.head.insertAdjacentHTML("beforeend", "<style>nextjs-portal{display:none!important}</style>")));
const page = await ctx.newPage();
const shot = async (name, target = page) => {
  await page.waitForLoadState("networkidle");
  await target.screenshot({ path: file(name) });
  console.log("✔", name);
};

// 1. Connexion (avant de se connecter)
await page.goto(`${BASE}/connexion`);
await shot("connexion-1.png");
await page.fill("#email", "membre@pride.local");
await page.fill("#password", "PrideDemo2026!");
await page.getByRole("button", { name: "Se connecter" }).click();
await page.waitForURL(`${BASE}/membre`);

// 2. Cotisations
await page.goto(`${BASE}/membre/cotisations`);
await shot("cotisations-1.png");

// 3. Photo (illustration neutre, pas de vrai visage) puis carte
const silhouette = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#cfe3d7"/><circle cx="300" cy="300" r="140" fill="#146b47"/><path d="M80 800c0-170 100-280 220-280s220 110 220 280z" fill="#146b47"/></svg>`,
);
await page.goto(`${BASE}/membre/profil`);
await page.setInputFiles("#photo", { name: "illustration.png", mimeType: "image/png", buffer: await sharp(silhouette).png().toBuffer() });
await page.getByRole("button", { name: "Enregistrer la photo" }).click();
await page.getByText("Photo enregistrée").waitFor();
await shot("carte-1.png", page.locator("main form").first());
await shot("profil-1.png", page.locator("main form").nth(1));
await page.goto(`${BASE}/membre`);
await page.getByRole("img", { name: "Ma photo" }).waitFor();
await shot("carte-2.png");

// 4. Formations, offres, compétences
await page.goto(`${BASE}/membre/formations`);
await shot("formations-1.png");
await page.goto(`${BASE}/membre/formations?vue=offres`);
await shot("offres-1.png");
await page.goto(`${BASE}/membre/competences`);
await shot("commissions-1.png");

// 5. Solidarité (formulaire ouvert)
await page.goto(`${BASE}/membre`);
await page.locator("#solidarite").getByRole("button", { name: "Déclarer un événement" }).click();
await shot("solidarite-1.png", page.locator("#solidarite"));

// 6. Messagerie et AG
await page.goto(`${BASE}/membre/messages`);
await shot("messagerie-1.png");
await page.goto(`${BASE}/membre/ag`);
await page.locator("#consultations").scrollIntoViewIfNeeded();
await shot("ag-1.png");

await browser.close();
