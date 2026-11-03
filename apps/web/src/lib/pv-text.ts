import { MAJORITES } from "@pride/shared";
import { KIND_LABELS, type AssemblyDetail } from "./assemblies";
import { formatDate, formatDateTime } from "./utils";

/** Phrases du procès-verbal, communes au PV à l'écran (`ProcesVerbal`) et au PDF publié (`pvPdf`). */
type Resolution = AssemblyDetail["resolutions"][number];

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
export const hour = (d: Date | string) => time.format(new Date(d));
export const person = (m: { lastName: string; firstNames: string } | null) => (m ? `${m.lastName} ${m.firstNames}` : "—");
const kindOf = (a: AssemblyDetail) => KIND_LABELS[a.kind].toLowerCase();

export const pvTitle = (a: AssemblyDetail) => `${a.status === "CARENCE" ? "Procès-verbal de carence" : "Procès-verbal"} de l'${kindOf(a)}`;
export const pvSubtitle = (a: AssemblyDetail) => `${a.reference}${a.convocationNumber >= 2 ? " · deuxième convocation" : ""} · ${formatDate(a.scheduledAt)}`;

export const pvOpening = (a: AssemblyDetail) =>
  `${a.openedAt ? `Le ${formatDate(a.openedAt)}` : `Le ${formatDateTime(a.scheduledAt)}`}, à ${a.location}, les membres de l'association PRIDe se sont réunis en ${kindOf(a)}` +
  (a.convocationNumber >= 2 && a.previous ? `, sur deuxième convocation, l'assemblée du ${formatDate(a.previous.scheduledAt)} (${a.previous.reference}) n'ayant pas réuni le quorum` : "") +
  (a.convokedAt ? `, sur convocation envoyée le ${formatDate(a.convokedAt)}` : "") +
  ".";

export const pvSession = (a: AssemblyDetail) =>
  a.openedAt ? `La séance est ouverte à ${hour(a.openedAt)} sous la présidence de ${person(a.president)}. ${person(a.secretary)} assure le secrétariat de séance.` : null;

export function pvQuorumItems(a: AssemblyDetail) {
  const nonVoters = a.attendances.length - a.presentVoters;
  return [
    `Membres ayant le droit de vote : ${a.eligibleVoters ?? "—"} (membres actifs majeurs ; pas de procuration)`,
    ...(a.convocationNumber < 2 ? [`Quorum requis (majorité absolue) : ${a.quorum ?? "—"}`] : []),
    `Votants présents : ${a.presentVoters}`,
    ...(nonVoters > 0 ? [`Présents sans droit de vote (mineurs, bienfaiteurs) : ${nonVoters}`] : []),
  ];
}

export const pvQuorumConclusion = (a: AssemblyDetail) =>
  a.status === "CARENCE"
    ? `Le quorum n'étant pas atteint (${a.presentVoters} votants présents sur ${a.quorum} requis), l'assemblée ne peut pas délibérer. Une deuxième assemblée sera convoquée sur le même ordre du jour ; elle délibérera valablement quel que soit le nombre de membres présents.`
    : a.convocationNumber >= 2
      ? "Sur deuxième convocation, l'assemblée délibère valablement quel que soit le nombre de membres présents."
      : a.canDeliberate || a.status === "CLOTUREE"
        ? "Le quorum étant atteint, l'assemblée peut valablement délibérer."
        : "Le quorum n'est pas encore atteint.";

export const pvResolutionTitle = (r: Resolution) => `Résolution n° ${r.position} : ${r.title}`;
export const pvMajority = (r: Resolution) => `${MAJORITES[r.majority].label} (${MAJORITES[r.majority].detail}).`;
/** `null` si la résolution n'est pas votée ; sinon le décompte, puis la décision. */
export const pvVote = (r: Resolution) =>
  r.adopted === null
    ? null
    : { count: `Votants présents : ${r.voters}. Pour : ${r.votesFor} · contre : ${r.votesAgainst} · abstentions : ${r.abstentions}.`, verdict: r.adopted ? "La résolution est adoptée." : "La résolution est rejetée." };

export const pvNotVoted = (a: AssemblyDetail) => (a.closedAt ? "Non votée." : "Non encore votée.");

export const pvClosing = (a: AssemblyDetail) =>
  a.closedAt
    ? `${a.status === "CARENCE" ? "La carence est constatée" : "L'ordre du jour étant épuisé, la séance est levée"} à ${hour(a.closedAt)}. De tout ce qui précède, il est dressé le présent procès-verbal.`
    : null;

export const PV_SIGNATURES = ["Le président de séance", "Le secrétaire de séance"] as const;
export const pvAnnexTitle = (a: AssemblyDetail) => `Annexe : liste d'émargement (${a.attendances.length})`;
