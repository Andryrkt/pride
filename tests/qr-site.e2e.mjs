// Code QR du site (tableau de bord des dirigeants) : visible et téléchargeable par l'administrateur seul, en PNG vert,
// PNG noir et SVG ; refusé aux autres dirigeants et sans connexion. Sans navigateur (requêtes HTTP seulement).
// Prérequis : base avec « pnpm db:seed » et l'application lancée.
//   node tests/qr-site.e2e.mjs
import { request } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { throw new Error(m); };

/** Session ouverte par l'API de connexion (le cookie est gardé par le contexte). */
async function session(email) {
  const ctx = await request.newContext({ baseURL: BASE, timeout: 240_000, extraHTTPHeaders: { Origin: BASE } });
  const r = await ctx.post("/api/auth/sign-in/email", { data: { email, password: "PrideDemo2026!" } });
  if (!r.ok()) fail(`connexion de ${email} : ${r.status()}`);
  return ctx;
}

const admin = await session("admin@pride.local");
const sg = await session("secretaire@pride.local");
const anon = await request.newContext({ baseURL: BASE, timeout: 240_000 });
try {
  if (!(await (await admin.get("/dirigeants")).text()).includes("Code QR du site")) fail("l'administrateur ne voit pas le code QR");
  if ((await (await sg.get("/dirigeants")).text()).includes("Code QR du site")) fail("la Secrétaire générale voit le code QR");
  log("tableau de bord : encadré visible de l'administrateur seul");

  for (const [format, type, ext] of [["png", "image/png", "png"], ["noir", "image/png", "png"], ["svg", "image/svg+xml", "svg"]]) {
    const r = await admin.get(`/api/qr-site?format=${format}`);
    const body = await r.body();
    if (r.status() !== 200 || r.headers()["content-type"] !== type) fail(`${format} : ${r.status()} ${r.headers()["content-type"]}`);
    if (!new RegExp(`attachment; filename="qr-.+\\.${ext}"`).test(r.headers()["content-disposition"] ?? "")) fail(`${format} : nom de fichier inattendu`);
    if (ext === "png" && (body.subarray(1, 4).toString() !== "PNG" || body.readUInt32BE(16) !== 1200)) fail(`${format} : PNG de 1200 px attendu`);
    if (ext === "svg" && !body.toString().includes("<svg")) fail("SVG invalide");
  }
  log("administrateur : PNG vert, PNG noir (1200 px) et SVG téléchargés");

  for (const [who, ctx] of [["Secrétaire générale", sg], ["visiteur sans compte", anon]]) {
    const s = (await ctx.get("/api/qr-site?format=png")).status();
    if (s !== 403) fail(`${who} : ${s} au lieu de 403`);
  }
  log("refusé à la Secrétaire générale et sans connexion");
} finally {
  await Promise.all([admin.dispose(), sg.dispose(), anon.dispose()]);
}
