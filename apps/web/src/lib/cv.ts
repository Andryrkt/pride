import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { db, eq, schema } from "@pride/db";
import { cvSchema, type Cv } from "@pride/shared";
import { memberPhoto } from "./photo";
import { latin } from "./pv-pdf";

type Member = typeof schema.members.$inferSelect;

/** CV enregistré, ou null. Une donnée devenue invalide (schéma modifié depuis) est ignorée plutôt que de casser la page. */
export async function getCv(memberId: string): Promise<Cv | null> {
  const row = await db.query.memberCvs.findFirst({ where: eq(schema.memberCvs.memberId, memberId) });
  const parsed = cvSchema.safeParse(row?.data);
  return parsed.success ? parsed.data : null;
}

export async function saveCv(memberId: string, cv: Cv) {
  await db
    .insert(schema.memberCvs)
    .values({ memberId, data: cv })
    .onConflictDoUpdate({ target: schema.memberCvs.memberId, set: { data: cv, updatedAt: new Date() } });
}

const GREEN = rgb(11 / 255, 63 / 255, 42 / 255);
const LIGHT = rgb(0.86, 0.94, 0.89);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.38, 0.4, 0.39);

/** CV en PDF (A4) : colonne verte à gauche (photo, contact, compétences, langues), parcours à droite. */
export async function cvPdf(m: Member, cv: Cv) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(latin(`CV ${m.firstNames} ${m.lastName}`));
  pdf.setAuthor(latin(`${m.firstNames} ${m.lastName}`));
  const [regular, bold] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
  const [W, H, M] = [595.28, 841.89, 40];
  const SIDE = 190; // largeur de la colonne verte

  /** Découpe un texte en lignes d'au plus `width` points. */
  const wrap = (s: string, font: PDFFont, size: number, width: number) =>
    latin(s).split("\n").flatMap((para) => {
      const lines: string[] = [];
      let line = "";
      for (const word of para.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
      }
      return [...lines, line];
    });

  // --- Colonne de gauche (première page) ---
  const first = pdf.addPage([W, H]);
  first.drawRectangle({ x: 0, y: 0, width: SIDE, height: H, color: GREEN });
  let ys = H - M;
  const sx = 22, sw = SIDE - 44;
  if (cv.showPhoto && m.photoKey) {
    try {
      const photo = await pdf.embedJpg(await memberPhoto(m.photoKey));
      const [pw, ph] = [105, 140];
      first.drawImage(photo, { x: (SIDE - pw) / 2, y: ys - ph, width: pw, height: ph });
      ys -= ph + 22;
    } catch { /* photo illisible : CV sans photo */ }
  }
  const side = (title: string, lines: { text: string; font?: PDFFont; size?: number }[]) => {
    if (!lines.length) return;
    first.drawText(latin(title.toUpperCase()), { x: sx, y: ys - 10, size: 10, font: bold, color: rgb(1, 1, 1) });
    ys -= 16;
    first.drawLine({ start: { x: sx, y: ys }, end: { x: sx + sw, y: ys }, thickness: 0.6, color: LIGHT });
    ys -= 8;
    for (const l of lines) {
      const size = l.size ?? 9;
      for (const w of wrap(l.text, l.font ?? regular, size, sw)) {
        if (ys < M) return;
        first.drawText(w, { x: sx, y: ys - size, size, font: l.font ?? regular, color: LIGHT });
        ys -= size * 1.45;
      }
      ys -= 2;
    }
    ys -= 14;
  };
  side("Contact", [m.phone, m.email, m.address].filter((x): x is string => !!x).map((text) => ({ text })));
  side("Compétences", m.skills.map((s) => ({ text: `• ${s}` })));
  side("Langues", cv.languages.flatMap((l) => [{ text: l.name, font: bold }, { text: l.level, size: 8.5 }]));
  if (cv.interests) side("Centres d'intérêt", [{ text: cv.interests }]);

  // --- Colonne principale (se poursuit sur d'autres pages si besoin) ---
  let page: PDFPage = first;
  const x0 = SIDE + 28, width = W - x0 - M;
  let y = H - M;
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const text = (s: string, o: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const size = o.size ?? 10;
    for (const l of wrap(s, o.font ?? regular, size, width)) {
      if (y < M + size) newPage();
      page.drawText(l, { x: x0, y: y - size, size, font: o.font ?? regular, color: o.color ?? INK });
      y -= size * 1.4;
    }
    y -= o.gap ?? 4;
  };
  const heading = (s: string) => {
    if (y < M + 70) newPage();
    y -= 6;
    text(s.toUpperCase(), { font: bold, size: 12, color: GREEN, gap: 0 });
    page.drawLine({ start: { x: x0, y: y + 2 }, end: { x: x0 + width, y: y + 2 }, thickness: 1, color: GREEN });
    y -= 10;
  };

  text(`${m.firstNames} ${m.lastName.toUpperCase()}`, { font: bold, size: 22, gap: 2 });
  text(cv.title, { size: 13, color: GREEN, gap: 14 });
  if (cv.summary) { heading("Profil"); text(cv.summary, { gap: 8 }); }
  if (cv.experiences.length) {
    heading("Expériences");
    for (const e of cv.experiences) {
      if (y < M + 50) newPage();
      text(e.role, { font: bold, size: 11, gap: 0 });
      text(`${e.org} · ${e.period}`, { size: 9.5, color: MUTED, gap: 2 });
      if (e.description) text(e.description, { size: 9.5 });
      y -= 6;
    }
  }
  if (cv.education.length) {
    heading("Formation");
    for (const e of cv.education) {
      if (y < M + 40) newPage();
      text(e.diploma, { font: bold, size: 11, gap: 0 });
      text(`${e.school} · ${e.year}`, { size: 9.5, color: MUTED, gap: 8 });
    }
  }
  return pdf.save();
}
