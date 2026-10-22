import { AIDE_SOLIDARITE, AG_CATEGORIES_VOTANTES, AG_DELAI_CONVOCATION_JOURS, PART_SECTION, TARIFS, type Majorite, type SolidariteConcerne, type MemberCategory } from "./constants";

/** Format « 10 000 Ar ». */
export function formatAriary(amount: number): string {
  const s = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${s} Ar`;
}

/** Période de cotisation au format « 2026-10 ». */
export function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Liste des périodes mensuelles de `from` à `to` inclus. */
export function periodsBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= end) {
    out.push(periodOf(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2026-10 » → « octobre 2026 ». */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-");
  return `${MOIS[Number(m) - 1]} ${y}`;
}

export function monthlyFee(category: MemberCategory): number {
  return TARIFS[category].cotisationMensuelle;
}

export function entryFee(category: MemberCategory): number {
  return TARIFS[category].droitEntree;
}

/** Âge en années révolues. */
export function ageOn(birthDate: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - birthDate.getFullYear();
  const m = on.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < birthDate.getDate())) age--;
  return age;
}

export function isMinor(birthDate: Date, on: Date = new Date()): boolean {
  return ageOn(birthDate, on) < 18;
}

/**
 * Agrément d'un nouveau membre (règlement intérieur, art. 1) :
 * majorité des membres du conseil d'administration présents.
 */
export function agrementAdopted(pour: number, presents: number): boolean {
  if (presents <= 0 || pour > presents) return false;
  return pour > presents / 2;
}

/** Exclusion (règlement intérieur, art. 2) : deux tiers des membres du CA présents. */
export function exclusionAdopted(pour: number, presents: number): boolean {
  if (presents <= 0 || pour > presents) return false;
  return pour * 3 >= presents * 2;
}

/** Quorum de l'AG (statuts, art. 18) : majorité absolue des membres ayant droit de vote. */
export function quorumAG(votants: number): number {
  return Math.floor(votants / 2) + 1;
}

/** Droit de vote à l'AG : membre actif (statut), de catégorie votante, majeur. */
export function canVoteAtAG(m: { status: string; category: MemberCategory; birthDate: Date | string | null }, on: Date = new Date()): boolean {
  if (m.status !== "ACTIF" || !AG_CATEGORIES_VOTANTES.includes(m.category)) return false;
  return !m.birthDate || !isMinor(new Date(m.birthDate), on);
}

/** L'AG peut délibérer : quorum atteint sur première convocation ; sans quorum sur deuxième convocation. */
export function agCanDeliberate(presentVoters: number, eligibleVoters: number, convocationNumber: number): boolean {
  return convocationNumber >= 2 || presentVoters >= quorumAG(eligibleVoters);
}

/** Jours pleins entre l'envoi de la convocation et la réunion ; « late » si moins que le délai des statuts. */
export function convocationDelay(sentAt: Date, meetingAt: Date): { days: number; late: boolean } {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.floor((day(meetingAt) - day(sentAt)) / 86_400_000);
  return { days, late: days < AG_DELAI_CONVOCATION_JOURS };
}

export type VoteResult = { pour: number; contre: number; abstention: number };

/** Le décompte est cohérent : nombres entiers positifs, pas plus de bulletins que de votants présents. */
export function voteValid(v: VoteResult, votants: number): boolean {
  const all = [v.pour, v.contre, v.abstention, votants];
  return all.every((n) => Number.isInteger(n) && n >= 0) && votants > 0 && v.pour + v.contre + v.abstention <= votants;
}

/** Adoption d'une résolution selon la majorité choisie (les majorités absolue et des 2/3 se calculent sur les votants présents). */
export function resolutionAdopted(majorite: Majorite, v: VoteResult, votants: number): boolean {
  if (!voteValid(v, votants)) return false;
  if (majorite === "SIMPLE") return v.pour > v.contre;
  if (majorite === "ABSOLUE") return v.pour > votants / 2;
  return v.pour * 3 >= votants * 2;
}

/** Répartition des cotisations d'une section régionale (règlement intérieur, art. 8 bis). */
export function sectionSplit(total: number): { section: number; association: number } {
  const section = Math.round(total * PART_SECTION);
  return { section, association: total - section };
}

/** Fin d'un mandat qui commence le `start` et dure `years` ans (CA : 5 ans ; bureau, commissions, sections : 1 an). */
export function mandateEnd(start: Date, years: number): Date {
  return new Date(Date.UTC(start.getUTCFullYear() + years, start.getUTCMonth(), start.getUTCDate()));
}

/** Un mandat est en cours le jour `on` s'il a commencé et que sa date de fin (incluse) n'est pas passée. */
export function mandateActive(m: { startsAt: Date | string; endsAt: Date | string | null }, on: Date = new Date()): boolean {
  const day = on.toISOString().slice(0, 10);
  const start = new Date(m.startsAt).toISOString().slice(0, 10);
  const end = m.endsAt ? new Date(m.endsAt).toISOString().slice(0, 10) : null;
  return start <= day && (end === null || end >= day);
}

/** Montant de l'aide de solidarité : 50 000 Ar pour le membre, 25 000 Ar pour sa famille proche. */
export function solidarityAmount(concerne: SolidariteConcerne): number {
  return concerne === "MEMBRE" ? AIDE_SOLIDARITE.membre : AIDE_SOLIDARITE.famille;
}

/** Numéro malgache sous une forme unique : « +261 34 12 345 67 » → « 0341234567 ». */
export function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "").replace(/^\+261/, "0");
}

/** Numéro de membre « PR-2026-0042 ». */
export function memberNumber(year: number, seq: number): string {
  return `PR-${year}-${String(seq).padStart(4, "0")}`;
}

export type AssistantIntent = "COTISATION" | "FORMATION" | "SOLIDARITE" | "AG" | "CARTE" | "RESPONSABLE" | "MERCI" | "INCONNU";

/** Assistant de la messagerie : sujet d'une question, par mots-clés (sans accents ni majuscules). */
export function assistantIntent(question: string): AssistantIntent {
  const s = question.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/responsable|humain|personne|bureau|tresor|secr|coordon|parler/.test(s)) return "RESPONSABLE";
  if (/cotis|payer|paie|recu|mvola|orange|airtel|retard/.test(s)) return "COTISATION";
  if (/format|atelier|cours|apprendre/.test(s)) return "FORMATION";
  if (/solidar|naissance|mariage|deces|malad|hospital|aide/.test(s)) return "SOLIDARITE";
  if (/\bag\b|assemblee|vote|quorum|convocation/.test(s)) return "AG";
  if (/carte|adherent|numero/.test(s)) return "CARTE";
  if (/merci/.test(s)) return "MERCI";
  return "INCONNU";
}
