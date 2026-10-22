// Carte de membre : photo ajoutée par le membre dans son profil (métadonnées retirées), code QR sur le tableau de bord,
// PDF en portrait (54 × 85,6 mm) avec photo, page de vérification publique.
// Prérequis : base avec « pnpm db:seed » (comptes de démonstration) et l'application lancée. Peut être relancé.
//   node tests/carte.e2e.mjs
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// CHROMIUM_PATH : utiliser un Chromium déjà installé au lieu de « playwright install ».
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  ctx.setDefaultTimeout(120_000);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/connexion`);
  await page.fill("#email", "membre@pride.local");
  await page.fill("#password", "PrideDemo2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${BASE}/membre`);

  // Photo fictive en paysage, avec une position GPS dans ses métadonnées
  const photo = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#c8372d" } })
    .jpeg()
    .withExif({ IFD0: { Artist: "Test PRIDe" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "18/1 54/1 0/1" } })
    .toBuffer();
  if (!(await sharp(photo).metadata()).exif) fail("la photo de test n'a pas de métadonnées");
  await page.goto(`${BASE}/membre/profil`);
  await page.setInputFiles("#photo", { name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("texte") });
  await page.getByRole("button", { name: "Enregistrer la photo" }).click();
  await page.getByText("Format accepté : JPG, PNG ou WEBP.").waitFor();
  await page.setInputFiles("#photo", { name: "photo.jpg", mimeType: "image/jpeg", buffer: photo });
  await page.getByRole("button", { name: "Enregistrer la photo" }).click();
  await page.getByText("Photo enregistrée").waitFor();
  log("photo : format refusé, puis photo enregistrée depuis le profil");

  const me = await (await page.request.get(`${BASE}/api/v1/me`)).json();
  const stored = await (await page.request.get(`${BASE}/api/photo/${me.member.id}`)).body();
  const meta = await sharp(stored).metadata();
  if (meta.width !== 600 || meta.height !== 800 || meta.format !== "jpeg") fail(`photo non recadrée : ${meta.width}×${meta.height} ${meta.format}`);
  if (meta.exif) fail("les métadonnées (GPS) n'ont pas été retirées");
  log("photo recadrée en 600 × 800, métadonnées GPS retirées");

  await page.goto(`${BASE}/membre`);
  await page.getByRole("img", { name: "Ma photo" }).waitFor();
  await page.getByRole("img", { name: "Code QR de vérification de la carte" }).locator("svg").waitFor();
  log("photo et code QR affichés sur la carte");

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Télécharger ma carte" }).click()]);
  const pdf = await PDFDocument.load(await readFile(await download.path()));
  const { width, height } = pdf.getPage(0).getSize();
  if (pdf.getPageCount() !== 1 || Math.abs(width - 153.1) > 1 || Math.abs(height - 242.6) > 1) fail(`PDF inattendu : ${pdf.getPageCount()} page(s), ${width}×${height} pt`);
  if (!/^carte-pride-PRIDE\d{10}\.pdf$/.test(download.suggestedFilename())) fail(`nom de fichier inattendu : ${download.suggestedFilename()}`);
  log("PDF en portrait téléchargé :", download.suggestedFilename(), "· 54 × 85,6 mm");

  // L'adresse du QR : /verifier/<identifiant du membre>
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`${BASE}/verifier/${me.member.id}`);
  await visitor.getByText("Carte valide").waitFor();
  await visitor.getByText(me.member.number).waitFor();
  if (!(await visitor.getByRole("img", { name: /^Photo de / }).evaluate((i) => i.complete && i.naturalWidth === 600))) fail("photo absente de la page de vérification");
  log("page de vérification : carte valide, avec la photo", me.member.number);

  await visitor.goto(`${BASE}/verifier/00000000-0000-0000-0000-000000000000`);
  await visitor.getByText("Carte non valide").waitFor();
  log("identifiant inconnu : carte non valide");

  const anon = await visitor.request.get(`${BASE}/api/carte`);
  if (anon.status() !== 401) fail(`carte téléchargeable sans connexion (${anon.status()})`);
  log("téléchargement refusé sans connexion");
  console.log("\nTous les contrôles sont passés.");
} catch (e) {
  console.error("✘", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
