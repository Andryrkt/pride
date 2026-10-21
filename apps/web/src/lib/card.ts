import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { TARIFS, type MemberCategory } from "@pride/shared";
import { env } from "./env";
import { memberPhoto } from "./photo";

type Member = { id: string; number: string; lastName: string; firstNames: string; category: string; joinedAt: Date | string; photoKey: string | null };

/** Adresse de vérification inscrite dans le QR : l'identifiant interne du membre est aléatoire, donc impossible à deviner. */
export const verifyUrl = (memberId: string) => `${env.appUrl}/verifier/${memberId}`;

export const cardQrSvg = (memberId: string) => QRCode.toString(verifyUrl(memberId), { type: "svg", margin: 1, errorCorrectionLevel: "M" });

const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const mm = (v: number) => (v * 72) / 25.4;

/** Texte centré, réduit si besoin pour tenir dans la largeur. */
function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, maxW: number) {
  while (size > 5 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.25;
  page.drawText(text, { x: (page.getWidth() - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
}

/** Carte de membre en portrait, au format carte bancaire (54 × 85,6 mm), avec photo, prête à imprimer. */
export async function cardPdf(m: Member & { photoKey: string }) {
  const [W, H] = [mm(54), mm(85.6)];
  const top = (v: number) => H - mm(v); // positions mesurées depuis le haut de la carte
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Carte de membre PRIDe ${m.number}`);
  pdf.setAuthor("Association PRIDe");
  const page = pdf.addPage([W, H]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const green = rgb(11 / 255, 63 / 255, 42 / 255);
  const light = rgb(221 / 255, 239 / 255, 228 / 255);
  const white = rgb(1, 1, 1);
  const inner = W - mm(8);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: green });

  // En-tête : logo à gauche, titre à droite
  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public/images/logo-blanc.png")));
  const logoH = mm(11);
  page.drawImage(logo, { x: mm(4), y: top(4) - logoH, width: (logo.width / logo.height) * logoH, height: logoH });
  for (const [i, line] of ["CARTE", "DE MEMBRE"].entries()) {
    page.drawText(line, { x: W - mm(4) - bold.widthOfTextAtSize(line, 6.5), y: top(8 + i * 3.2), size: 6.5, font: bold, color: light });
  }

  // Photo d'identité 3:4, cadre blanc
  const [pw, ph] = [mm(24), mm(32)];
  const px = (W - pw) / 2;
  page.drawRectangle({ x: px - 1.5, y: top(18) - ph - 1.5, width: pw + 3, height: ph + 3, color: white });
  const photo = await pdf.embedJpg(await memberPhoto(m.photoKey));
  page.drawImage(photo, { x: px, y: top(18) - ph, width: pw, height: ph });

  // Identité
  centered(page, m.lastName, top(55), bold, 10, white, inner);
  centered(page, m.firstNames, top(59), bold, 8.5, white, inner);
  centered(page, `N° ${m.number} · ${TARIFS[m.category as MemberCategory].label}`, top(63.3), regular, 6.5, light, inner);
  centered(page, `Membre depuis ${monthYear.format(new Date(m.joinedAt))}`, top(66.4), regular, 6.5, light, inner);

  // QR de vérification
  const qr = await pdf.embedPng(await QRCode.toBuffer(verifyUrl(m.id), { margin: 1, width: 300, errorCorrectionLevel: "M" }));
  const qrSize = mm(12.5);
  page.drawImage(qr, { x: (W - qrSize) / 2, y: mm(3.4), width: qrSize, height: qrSize });
  centered(page, "Validité : scanner le code", mm(1.6), regular, 4.5, light, inner);

  return pdf.save();
}
