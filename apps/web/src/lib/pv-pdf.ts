import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { and, db, eq, isNull, schema } from "@pride/db";
import { AssemblyError, getAssembly, KIND_LABELS, type AssemblyDetail } from "./assemblies";
import { announceDocument, publishDocument } from "./documents";
import {
  hour, person, pvAnnexTitle, pvClosing, pvMajority, pvNotVoted, pvOpening, pvQuorumConclusion, pvQuorumItems,
  pvResolutionTitle, pvSession, pvSubtitle, pvTitle, pvVote, PV_SIGNATURES,
} from "./pv-text";
import { formatDate } from "./utils";
// Les polices standard du PDF ne connaissent que l'alphabet latin (WinAnsi) : les autres caractères deviennent « ? ».
const latin = (s: string) =>
  s.replace(/\r/g, "").replace(/\t/g, " ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\n\x20-\x7E -ÿ–—…•€Œœ]/g, "?");

/** Procès-verbal de l'AG en PDF (A4) : mêmes phrases que le PV à l'écran (`pv-text.ts`), seule la mise en page diffère. */
export async function pvPdf(a: AssemblyDetail) {
  const carence = a.status === "CARENCE";
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${pvTitle(a)} ${a.reference}`);
  pdf.setAuthor("Association PRIDe");
  const [regular, bold] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
  const [W, H, M] = [595.28, 841.89, 56];
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };

  /** Paragraphe découpé en lignes à la largeur de la page ; nouvelle page si besoin. */
  const text = (s: string, o: { font?: PDFFont; size?: number; gap?: number; center?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    const font = o.font ?? regular;
    const size = o.size ?? 11;
    for (const para of latin(s).split("\n")) {
      const lines: string[] = [];
      let line = "";
      for (const word of para.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > W - 2 * M && line) { lines.push(line); line = word; } else line = next;
      }
      lines.push(line);
      for (const l of lines) {
        if (y < M + size) newPage();
        const x = o.center ? (W - font.widthOfTextAtSize(l, size)) / 2 : M;
        page.drawText(l, { x, y: y - size, size, font, color: o.color ?? rgb(0.1, 0.1, 0.1) });
        y -= size * 1.45;
      }
    }
    y -= o.gap ?? 8;
  };
  const heading = (s: string) => { if (y < M + 60) newPage(); text(s, { font: bold, size: 13, gap: 4 }); };

  text("ASSOCIATION PRIDe", { font: bold, size: 11, center: true, gap: 0, color: rgb(11 / 255, 63 / 255, 42 / 255) });
  text("Partage Responsabilité Intégrité pour le Développement · Antananarivo", { size: 9, center: true, gap: 14 });
  text(pvTitle(a), { font: bold, size: 17, center: true, gap: 2 });
  text(pvSubtitle(a), { size: 10, center: true, gap: 18 });

  text(pvOpening(a));
  const session = pvSession(a);
  if (session) text(session);

  heading("Quorum");
  text(pvQuorumItems(a).map((x) => `• ${x}`).join("\n"), { gap: 4 });
  text(pvQuorumConclusion(a));

  heading("Ordre du jour");
  text(a.agenda);

  if (!carence && a.resolutions.length) {
    heading("Délibérations");
    for (const r of a.resolutions) {
      text(pvResolutionTitle(r), { font: bold, gap: 2 });
      text(r.text, { gap: 2 });
      text(pvMajority(r), { size: 9.5, gap: 2 });
      const vote = pvVote(r);
      text(vote ? `${vote.count} ${vote.verdict}` : pvNotVoted(a), { gap: 10 });
    }
  }

  if (a.notes) { heading("Observations"); text(a.notes); }
  const closing = pvClosing(a);
  if (closing) text(closing, { gap: 24 });

  // Signatures : à apposer sur la version imprimée
  if (y < M + 90) newPage();
  for (const [i, label] of PV_SIGNATURES.entries()) {
    const x = M + i * ((W - 2 * M) / 2 + 10);
    page.drawText(latin(label), { x, y: y - 11, size: 10, font: bold });
    page.drawLine({ start: { x, y: y - 60 }, end: { x: x + 200, y: y - 60 }, thickness: 0.6 });
    page.drawText(latin(person(i === 0 ? a.president : a.secretary)), { x, y: y - 74, size: 10, font: regular });
  }

  // Annexe : liste d'émargement
  newPage();
  text(pvAnnexTitle(a), { font: bold, size: 13, gap: 6 });
  if (!a.attendances.length) text("Aucun membre n'a émargé.");
  for (const x of a.attendances) text(`${x.member.number}   ${x.member.lastName} ${x.member.firstNames}   · droit de vote : ${x.canVote ? "oui" : "non"} · arrivée ${hour(x.signedAt)}`, { size: 9.5, gap: 0 });

  return Buffer.from(await pdf.save());
}

const minutesFile = (a: { reference: string }) => `pv-${a.reference.toLowerCase()}.pdf`;

/** PV de l'AG déjà publié (et non retiré) dans les documents officiels, reconnu au nom de fichier donné par `publishMinutes`. */
export const publishedMinutes = (a: { reference: string }) =>
  db.query.officialDocuments.findFirst({ where: and(eq(schema.officialDocuments.kind, "PV"), eq(schema.officialDocuments.filename, minutesFile(a)), isNull(schema.officialDocuments.archivedAt)) });

/**
 * PV en PDF publié dans l'espace membres, avec actualité et e-mail aux membres : automatiquement à la clôture (ou à la carence),
 * ou plus tard depuis la page de l'AG (AG clôturées avant cette fonction, ou après un échec).
 */
export async function publishMinutes(assemblyId: string, actorId: string) {
  const a = await getAssembly(assemblyId);
  if (!a || (a.status !== "CLOTUREE" && a.status !== "CARENCE")) throw new AssemblyError("Le PV n'est définitif qu'après la clôture de la séance ou le constat de carence.");
  if (await publishedMinutes(a)) throw new AssemblyError("Le PV de cette AG est déjà publié dans les documents officiels.");
  const carence = a.status === "CARENCE";
  const doc = await publishDocument(
    {
      kind: "PV",
      title: `${carence ? "Procès-verbal de carence" : "Procès-verbal"} : ${a.title} (${a.reference})`,
      description: `${KIND_LABELS[a.kind]} du ${formatDate(a.scheduledAt)}, établi par l'application ; l'original signé est conservé par le Secrétariat`,
      adoptedOn: a.closedAt,
      visibility: "MEMBRES",
    },
    { name: minutesFile(a), content: await pvPdf(a) },
    actorId,
  );
  await announceDocument(doc, actorId);
  return doc;
}
