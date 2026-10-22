/**
 * Règles tirées des statuts et du règlement intérieur de PRIDe
 * (adoptés par l'Assemblée générale du 27 septembre 2026).
 * Les montants sont en Ariary et peuvent être révisés chaque année par l'AG.
 */
export const TARIFS = {
  ACTIF: { droitEntree: 5_000, cotisationMensuelle: 10_000, label: "Membre actif" },
  ACTIF_MINEUR: { droitEntree: 5_000, cotisationMensuelle: 5_000, label: "Membre actif mineur" },
  BIENFAITEUR: { droitEntree: 20_000, cotisationMensuelle: 60_000, label: "Membre bienfaiteur" },
} as const;

export type MemberCategory = keyof typeof TARIFS;

/** Règlement intérieur, art. 6 : aide versée lors d'un événement heureux ou douloureux. */
export const AIDE_SOLIDARITE = { membre: 50_000, famille: 25_000 } as const;

/** Offres partagées entre membres. */
export const OFFER_TYPES = { STAGE: "Stage", EMPLOI: "Emploi", BENEVOLAT: "Bénévolat" } as const;
export type OfferType = keyof typeof OFFER_TYPES;

/** Événements ouvrant droit à l'aide de solidarité (heureux ou douloureux). */
export const SOLIDARITE_EVENEMENTS = { MARIAGE: "Mariage", NAISSANCE: "Naissance", MALADIE: "Maladie ou hospitalisation", DECES: "Décès" } as const;
export type SolidariteEvenement = keyof typeof SOLIDARITE_EVENEMENTS;
/** Bénéficiaire : le membre lui-même, ou sa famille proche. */
export const SOLIDARITE_CONCERNE = { MEMBRE: "Moi-même", FAMILLE: "Parent, frère ou sœur" } as const;
export type SolidariteConcerne = keyof typeof SOLIDARITE_CONCERNE;

/** Règlement intérieur, art. 8 bis : part des cotisations laissée à une section régionale. */
export const PART_SECTION = 0.9;

export const COMMISSIONS = [
  { slug: "formation-projets", name: "Formation et projets", description: "Conçoit et organise les formations et les projets." },
  { slug: "finances", name: "Finances", description: "Recherche des moyens financiers au-delà des cotisations." },
  { slug: "logistique", name: "Logistique", description: "Organise et gère les moyens matériels des activités." },
  { slug: "communication", name: "Communication", description: "Fait connaître PRIDe, en interne et en externe." },
  { slug: "sociale", name: "Sociale", description: "Anime la vie sociale et la solidarité entre membres." },
  { slug: "partenariats", name: "Partenariats", description: "Développe les liens avec les organismes publics et privés." },
  { slug: "enquete", name: "Enquête", description: "Mène les études utiles au développement de l'association." },
] as const;

/** Assemblée générale : la convocation est envoyée au moins 15 jours avant la réunion. */
export const AG_DELAI_CONVOCATION_JOURS = 15;

/** Seuls les membres actifs majeurs votent à l'AG (ni mineurs, ni bienfaiteurs, pas de procuration). */
export const AG_CATEGORIES_VOTANTES: MemberCategory[] = ["ACTIF"];

export const MAJORITES = {
  SIMPLE: { label: "Majorité simple", detail: "plus de voix pour que de voix contre" },
  ABSOLUE: { label: "Majorité absolue", detail: "plus de la moitié des votants présents" },
  DEUX_TIERS: { label: "Majorité des deux tiers", detail: "au moins deux tiers des votants présents" },
} as const;

export type Majorite = keyof typeof MAJORITES;

/** Les responsables de commission sont désignés pour un an. */
export const DUREE_MANDAT_COMMISSION = 1;

export const ROLE_LABELS = {
  PRESIDENT: "Président du conseil d'administration",
  VICE_PRESIDENT: "Vice-président",
  CONSEILLER: "Conseiller d'administration",
  COORDONNATEUR: "Coordonnateur",
  SECRETAIRE_GENERALE: "Secrétaire générale",
  TRESORIER: "Trésorier",
  RESPONSABLE_COMMISSION: "Responsable de commission",
  RESPONSABLE_SECTION: "Responsable de section",
  ADMIN_TECHNIQUE: "Administrateur du site",
} as const;

export type MandateRole = keyof typeof ROLE_LABELS;

/** Rôles membres du conseil d'administration (statuts, art. 10). */
export const CA_ROLES: MandateRole[] = ["PRESIDENT", "VICE_PRESIDENT", "CONSEILLER"];
/** Rôles du bureau exécutif (statuts, art. 14). */
export const BUREAU_ROLES: MandateRole[] = ["COORDONNATEUR", "SECRETAIRE_GENERALE", "TRESORIER"];
/** Rôles ayant accès à l'espace dirigeants. */
export const DIRIGEANT_ROLES: MandateRole[] = [...CA_ROLES, ...BUREAU_ROLES, "ADMIN_TECHNIQUE"];

export const DOCUMENT_KINDS = {
  RESIDENCE: "Certificat de résidence",
  CIN: "CIN (photocopie légalisée)",
  ACTE_NAISSANCE: "Acte de naissance",
  CV: "Curriculum vitae",
  LETTRE: "Lettre de motivation",
} as const;

export type DocumentKind = keyof typeof DOCUMENT_KINDS;

export const PAYMENT_PROVIDERS = {
  MVOLA: "MVola",
  ORANGE_MONEY: "Orange Money",
  AIRTEL_MONEY: "Airtel Money",
} as const;

export type PaymentProviderId = keyof typeof PAYMENT_PROVIDERS;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
