/**
 * Schéma de la base de données PRIDe (Drizzle ORM, PostgreSQL).
 * Les règles viennent des statuts et du règlement intérieur adoptés le 27 septembre 2026.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Authentification (tables utilisées par Better Auth)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Membres (statuts, titre II) et organes (titre III)
// ---------------------------------------------------------------------------

export const memberCategory = pgEnum("member_category", ["ACTIF", "ACTIF_MINEUR", "BIENFAITEUR"]);
export const memberStatus = pgEnum("member_status", ["ACTIF", "DEMISSIONNAIRE", "EXCLU", "DECEDE"]);

export const sections = pgTable("sections", {
  id: id(),
  name: text("name").notNull().unique(),
  region: text("region").notNull(),
  openedAt: date("opened_at", { mode: "date" }).notNull().defaultNow(),
  closedAt: date("closed_at", { mode: "date" }),
});

export const members = pgTable(
  "members",
  {
    id: id(),
    number: text("number").notNull().unique(), // PRIDE2026100001
    userId: text("user_id")
      .unique()
      .references(() => user.id, { onDelete: "set null" }),
    lastName: text("last_name").notNull(),
    firstNames: text("first_names").notNull(),
    birthDate: date("birth_date", { mode: "date" }),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    profession: text("profession"),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    /** Accord du membre pour figurer dans l'annuaire des compétences (loi n° 2014-038) : non par défaut. */
    shareSkills: boolean("share_skills").notNull().default(false),
    category: memberCategory("category").notNull().default("ACTIF"),
    status: memberStatus("status").notNull().default("ACTIF"),
    /** Fin de la qualité de membre (démission, exclusion, décès) : date et note du registre. */
    statusChangedAt: date("status_changed_at", { mode: "date" }),
    statusNote: text("status_note"),
    joinedAt: date("joined_at", { mode: "date" }).notNull().defaultNow(),
    isFounder: boolean("is_founder").notNull().default(false),
    /** Mineur : parent ou tuteur membre (statuts, art. 5). */
    parentId: text("parent_id"),
    sponsorId: text("sponsor_id"),
    sectionId: text("section_id").references(() => sections.id),
    /** Photo d'identité de la carte (JPEG 600 × 800, sans métadonnées). */
    photoKey: text("photo_key"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("members_last_name_idx").on(t.lastName)],
);

export const mandateRole = pgEnum("mandate_role", [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "CONSEILLER",
  "COORDONNATEUR",
  "SECRETAIRE_GENERALE",
  "TRESORIER",
  "RESPONSABLE_COMMISSION",
  "RESPONSABLE_SECTION",
  "ADMIN_TECHNIQUE",
  /** Tient la comptabilité (espace Finances) sans être dirigeant ; désigné par le CA ou l'administrateur. */
  "COMPTABLE",
]);

export const commissions = pgTable("commissions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: createdAt(),
});

/** CA : 5 ans · bureau exécutif, responsables de commission et de section : 1 an. */
export const mandates = pgTable(
  "mandates",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    role: mandateRole("role").notNull(),
    startsAt: date("starts_at", { mode: "date" }).notNull(),
    endsAt: date("ends_at", { mode: "date" }),
    commissionId: text("commission_id").references(() => commissions.id),
    sectionId: text("section_id").references(() => sections.id),
    createdAt: createdAt(),
  },
  (t) => [index("mandates_member_idx").on(t.memberId)],
);

export const commissionMemberships = pgTable(
  "commission_memberships",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    commissionId: text("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    joinedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.commissionId] })],
);

/**
 * Procédure d'exclusion (règlement intérieur, art. 2) : le membre est informé du motif et convoqué pour se défendre,
 * puis le CA délibère ; l'exclusion demande les deux tiers des membres présents.
 */
export const exclusionStatus = pgEnum("exclusion_status", ["OUVERTE", "ADOPTEE", "REJETEE"]);

export const exclusionProcedures = pgTable(
  "exclusion_procedures",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    reason: text("reason").notNull(),
    hearingAt: timestamp("hearing_at", { withTimezone: true }).notNull(),
    status: exclusionStatus("status").notNull().default("OUVERTE"),
    defense: text("defense"),
    meetingDate: date("meeting_date", { mode: "date" }),
    presents: integer("presents"),
    votesFor: integer("votes_for"),
    votesAgainst: integer("votes_against"),
    openedBy: text("opened_by"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  // Une seule procédure en cours par membre.
  (t) => [uniqueIndex("exclusion_procedures_open_uq").on(t.memberId).where(sql`status = 'OUVERTE'`)],
);

// ---------------------------------------------------------------------------
// Assemblées générales et procès-verbaux (statuts, art. 18)
// ---------------------------------------------------------------------------

export const assemblyKind = pgEnum("assembly_kind", ["ORDINAIRE", "EXTRAORDINAIRE"]);
/** CARENCE : quorum non atteint sur première convocation (une deuxième AG est alors convoquée). */
export const assemblyStatus = pgEnum("assembly_status", ["PREPARATION", "CONVOQUEE", "EN_SEANCE", "CLOTUREE", "CARENCE"]);
export const majority = pgEnum("majority", ["SIMPLE", "ABSOLUE", "DEUX_TIERS"]);

/**
 * Une AG clôturée (ou constatée en carence) ne peut plus être modifiée, ni ses résolutions ni sa liste
 * d'émargement : un déclencheur PostgreSQL l'impose (migration 0002), comme pour le journal comptable.
 */
export const assemblies = pgTable(
  "assemblies",
  {
    id: id(),
    reference: text("reference").notNull().unique(), // AG-2026-01
    kind: assemblyKind("kind").notNull().default("ORDINAIRE"),
    title: text("title").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    location: text("location").notNull(),
    agenda: text("agenda").notNull(),
    status: assemblyStatus("status").notNull().default("PREPARATION"),
    /** 1 : première convocation (quorum requis) · 2 : deuxième convocation (sans quorum). */
    convocationNumber: integer("convocation_number").notNull().default(1),
    previousId: text("previous_id"),
    convokedAt: timestamp("convoked_at", { withTimezone: true }),
    convocationsSent: integer("convocations_sent"),
    /** Photographie à l'ouverture de la séance : membres ayant droit de vote et quorum. */
    openedAt: timestamp("opened_at", { withTimezone: true }),
    eligibleVoters: integer("eligible_voters"),
    quorum: integer("quorum"),
    presidentId: text("president_id").references(() => members.id),
    secretaryId: text("secretary_id").references(() => members.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("assemblies_scheduled_idx").on(t.scheduledAt)],
);

/** Liste d'émargement. `canVote` est figé au moment de la signature. */
export const assemblyAttendances = pgTable(
  "assembly_attendances",
  {
    assemblyId: text("assembly_id")
      .notNull()
      .references(() => assemblies.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    canVote: boolean("can_vote").notNull(),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assemblyId, t.memberId] })],
);

export const resolutions = pgTable(
  "resolutions",
  {
    id: id(),
    assemblyId: text("assembly_id")
      .notNull()
      .references(() => assemblies.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    text: text("text").notNull(),
    majority: majority("majority").notNull().default("SIMPLE"),
    /** Votants présents au moment du vote. */
    voters: integer("voters"),
    votesFor: integer("votes_for"),
    votesAgainst: integer("votes_against"),
    abstentions: integer("abstentions"),
    adopted: boolean("adopted"),
    votedAt: timestamp("voted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("resolutions_position_uq").on(t.assemblyId, t.position)],
);

/**
 * Consultation en ligne : avis des membres (ex. thème de formation prioritaire), distincte des résolutions,
 * qui restent votées en séance d'AG (quorum des présents, pas de procuration).
 */
export const consultations = pgTable("consultations", {
  id: id(),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

/** Qui a voté (un vote par membre). Volontairement sans lien avec le bulletin : le vote est anonyme. */
export const consultationVoters = pgTable(
  "consultation_voters",
  {
    consultationId: text("consultation_id")
      .notNull()
      .references(() => consultations.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
  },
  (t) => [primaryKey({ columns: [t.consultationId, t.memberId] })],
);

/** Bulletins anonymes : seulement le choix, ni membre ni heure. */
export const consultationBallots = pgTable(
  "consultation_ballots",
  {
    id: id(),
    consultationId: text("consultation_id")
      .notNull()
      .references(() => consultations.id, { onDelete: "cascade" }),
    option: integer("option").notNull(),
  },
  (t) => [index("consultation_ballots_idx").on(t.consultationId)],
);

// ---------------------------------------------------------------------------
// Candidatures (règlement intérieur, art. 1)
// ---------------------------------------------------------------------------

export const applicationStatus = pgEnum("application_status", ["SOUMISE", "ENTRETIEN", "VOTE_CA", "AGREEE", "REFUSEE", "MEMBRE"]);
export const sponsorship = pgEnum("sponsorship", ["PARRAIN", "ENTRETIEN"]);
export const documentKind = pgEnum("document_kind", ["RESIDENCE", "CIN", "ACTE_NAISSANCE", "CV", "LETTRE"]);

export const applications = pgTable(
  "applications",
  {
    id: id(),
    reference: text("reference").notNull().unique(), // C-2026-0018
    status: applicationStatus("status").notNull().default("SOUMISE"),
    lastName: text("last_name").notNull(),
    firstNames: text("first_names").notNull(),
    birthDate: date("birth_date", { mode: "date" }).notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address").notNull(),
    profession: text("profession"),
    skills: text("skills"),
    expectations: text("expectations"),
    category: memberCategory("category").notNull(),
    sponsorship: sponsorship("sponsorship").notNull(),
    sponsorId: text("sponsor_id").references(() => members.id),
    interviewAt: timestamp("interview_at", { withTimezone: true }),
    parentName: text("parent_name"),
    parentMemberNumber: text("parent_member_number"),
    /** Délibération du conseil d'administration. */
    meetingDate: date("meeting_date", { mode: "date" }),
    presents: integer("presents"),
    votesFor: integer("votes_for"),
    votesAgainst: integer("votes_against"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
    notes: text("notes"),
    memberId: text("member_id")
      .unique()
      .references(() => members.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("applications_status_idx").on(t.status)],
);

export const applicationDocuments = pgTable(
  "application_documents",
  {
    id: id(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: documentKind("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("application_documents_kind_uq").on(t.applicationId, t.kind)],
);

// ---------------------------------------------------------------------------
// Cotisations, paiements, comptabilité (statuts, titres IV et V)
// ---------------------------------------------------------------------------

export const dueKind = pgEnum("due_kind", ["DROIT_ENTREE", "COTISATION"]);
export const dueStatus = pgEnum("due_status", ["A_PAYER", "PAYEE"]);
export const paymentProvider = pgEnum("payment_provider", ["MVOLA", "ORANGE_MONEY", "AIRTEL_MONEY", "ESPECES"]);
export const paymentStatus = pgEnum("payment_status", ["EN_ATTENTE", "REUSSI", "ECHOUE"]);
export const ledgerDirection = pgEnum("ledger_direction", ["RECETTE", "DEPENSE"]);

export const payments = pgTable("payments", {
  id: id(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id),
  amount: integer("amount").notNull(),
  provider: paymentProvider("provider").notNull(),
  phone: text("phone"),
  status: paymentStatus("status").notNull().default("EN_ATTENTE"),
  providerRef: text("provider_ref"),
  receiptNumber: text("receipt_number").unique(), // R-2026-0418
  createdAt: createdAt(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

export const dues = pgTable(
  "dues",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    kind: dueKind("kind").notNull(),
    period: text("period").notNull(), // "2026-10"
    amount: integer("amount").notNull(), // Ariary
    status: dueStatus("status").notNull().default("A_PAYER"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentId: text("payment_id").references(() => payments.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("dues_member_kind_period_uq").on(t.memberId, t.kind, t.period), index("dues_status_idx").on(t.status)],
);

/**
 * Journal comptable. Statuts, art. 21 : aucune écriture validée ne peut être modifiée ni supprimée.
 * Un déclencheur PostgreSQL (migration 0001) l'interdit ; les erreurs se corrigent par une rectification.
 */
export const ledgerEntries = pgTable("ledger_entries", {
  id: id(),
  number: serial("number").notNull().unique(),
  date: date("date", { mode: "date" }).notNull().defaultNow(),
  label: text("label").notNull(),
  direction: ledgerDirection("direction").notNull(),
  amount: integer("amount").notNull(),
  pieceRef: text("piece_ref"),
  paymentId: text("payment_id")
    .unique()
    .references(() => payments.id),
  correctsId: text("corrects_id"),
  /** Compte du livre (`LEDGER_ACCOUNTS`) ; vide pour les écritures antérieures au livre, qui ne peuvent plus être modifiées. */
  account: text("account"),
  /** Commission à laquelle l'écriture se rapporte (vide = générale), pour le suivi du budget. */
  commissionId: text("commission_id").references(() => commissions.id),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Actualités, événements, contact, traçabilité
// ---------------------------------------------------------------------------

/** FORMATION : session animée par des membres, avec un domaine et un nombre de places. */
export const postType = pgEnum("post_type", ["ARTICLE", "EVENEMENT", "ANNONCE", "FORMATION"]);
export const visibility = pgEnum("visibility", ["PUBLIC", "MEMBRES"]);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    type: postType("type").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    visibility: visibility("visibility").notNull().default("PUBLIC"),
    eventAt: timestamp("event_at", { withTimezone: true }),
    location: text("location"),
    /** Formation : domaine (Bureautique, Langues…) et nombre de places (vide = sans limite). */
    domain: text("domain"),
    capacity: integer("capacity"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    authorId: text("author_id").references(() => members.id),
  },
  (t) => [index("posts_visibility_published_idx").on(t.visibility, t.publishedAt)],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: id(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => members.id),
    name: text("name"),
    phone: text("phone"),
    createdAt: createdAt(),
  },
  /** Inscription publique (sans compte) : un même numéro, normalisé « 0341234567 », ne s'inscrit qu'une fois. */
  (t) => [uniqueIndex("event_registrations_member_uq").on(t.postId, t.memberId), uniqueIndex("event_registrations_phone_uq").on(t.postId, t.phone)],
);

// ---------------------------------------------------------------------------
// Offres (stages, emplois, bénévolat), coups de main, demandes d'entrée en commission
// ---------------------------------------------------------------------------

export const offerType = pgEnum("offer_type", ["STAGE", "EMPLOI", "BENEVOLAT"]);
/** Une offre proposée par un membre n'est visible qu'une fois validée par un dirigeant. */
export const offerStatus = pgEnum("offer_status", ["PROPOSEE", "PUBLIEE", "REFUSEE", "CLOTUREE"]);

export const offers = pgTable(
  "offers",
  {
    id: id(),
    authorId: text("author_id")
      .notNull()
      .references(() => members.id),
    type: offerType("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    location: text("location"),
    status: offerStatus("status").notNull().default("PROPOSEE"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    createdAt: createdAt(),
  },
  (t) => [index("offers_status_idx").on(t.status)],
);

/** « Je suis intéressé(e) » : les coordonnées du membre sont transmises à l'auteur de l'offre. */
export const offerInterests = pgTable(
  "offer_interests",
  {
    offerId: text("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.offerId, t.memberId] })],
);

/** « Demander un coup de main » à un membre de l'annuaire des compétences (une fois par membre). */
export const helpRequests = pgTable(
  "help_requests",
  {
    fromId: text("from_id")
      .notNull()
      .references(() => members.id),
    toId: text("to_id")
      .notNull()
      .references(() => members.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.fromId, t.toId] })],
);

/** Demande d'entrée dans une commission, acceptée ou refusée par le CA, le Coordonnateur ou l'administrateur. */
export const commissionRequestStatus = pgEnum("commission_request_status", ["DEMANDEE", "ACCEPTEE", "REFUSEE"]);

export const commissionRequests = pgTable(
  "commission_requests",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    commissionId: text("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    status: commissionRequestStatus("status").notNull().default("DEMANDEE"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  // Une seule demande en attente par membre et par commission.
  (t) => [uniqueIndex("commission_requests_pending_uq").on(t.memberId, t.commissionId).where(sql`status = 'DEMANDEE'`)],
);

// ---------------------------------------------------------------------------
// Messagerie des membres : assistant automatique, puis responsables
// ---------------------------------------------------------------------------

export const messageRecipient = pgEnum("message_recipient", ["ASSISTANT", "TRESORIER", "SECRETARIAT", "COORDONNATEUR", "COMMISSION_SOCIALE"]);
export const messageSender = pgEnum("message_sender", ["MEMBRE", "ASSISTANT", "EQUIPE"]);

/** Une conversation par membre et par destinataire. Les dates de lecture servent aux pastilles « non lu ». */
export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    recipient: messageRecipient("recipient").notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    lastSender: messageSender("last_sender").notNull().default("MEMBRE"),
    memberReadAt: timestamp("member_read_at", { withTimezone: true }),
    staffReadAt: timestamp("staff_read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("conversations_member_recipient_uq").on(t.memberId, t.recipient), index("conversations_last_idx").on(t.lastMessageAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender: messageSender("sender").notNull(),
    /** Membre qui écrit (le membre lui-même, ou le dirigeant qui répond). Vide pour l'assistant. */
    authorId: text("author_id").references(() => members.id),
    body: text("body").notNull(),
    /** Assistant : liens utiles et boutons de réponse rapide (« MENU » ou « TRANSFERT »). */
    links: jsonb("links").$type<{ label: string; href: string }[]>(),
    chips: text("chips"),
    attachmentKey: text("attachment_key"),
    attachmentName: text("attachment_name"),
    attachmentType: text("attachment_type"),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

/** Aide de solidarité (RI art. 6) : 50 000 Ar au membre, 25 000 Ar à sa famille proche. */
export const solidarityKind = pgEnum("solidarity_kind", ["MARIAGE", "NAISSANCE", "MALADIE", "DECES"]);
export const solidarityConcerns = pgEnum("solidarity_concerns", ["MEMBRE", "FAMILLE"]);
export const solidarityStatus = pgEnum("solidarity_status", ["DEMANDEE", "ACCORDEE", "REFUSEE", "VERSEE"]);

export const solidarityRequests = pgTable(
  "solidarity_requests",
  {
    id: id(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    kind: solidarityKind("kind").notNull(),
    concerns: solidarityConcerns("concerns").notNull(),
    eventDate: date("event_date", { mode: "date" }).notNull(),
    message: text("message"),
    /** Pièce jointe facultative (certificat, faire-part…), visible des dirigeants seulement. */
    attachmentKey: text("attachment_key"),
    attachmentName: text("attachment_name"),
    attachmentType: text("attachment_type"),
    /** Montant fixé à la demande selon le bénéficiaire. */
    amount: integer("amount").notNull(),
    status: solidarityStatus("status").notNull().default("DEMANDEE"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
    decisionNote: text("decision_note"),
    /** Versement enregistré au journal comptable (dépense). */
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  // Une même déclaration envoyée deux fois ne crée qu'une demande.
  (t) => [uniqueIndex("solidarity_requests_uq").on(t.memberId, t.kind, t.concerns, t.eventDate), index("solidarity_requests_status_idx").on(t.status)],
);

/**
 * Budget annuel : préparé en brouillon (lignes générales et lignes des commissions), adopté par le CA, puis verrouillé.
 * Une modification passe par un budget rectificatif (version suivante) ; à son adoption, l'ancien devient « remplacé ».
 */
export const budgetStatus = pgEnum("budget_status", ["BROUILLON", "ADOPTE", "REMPLACE"]);

export const budgets = pgTable(
  "budgets",
  {
    id: id(),
    year: integer("year").notNull(),
    version: integer("version").notNull(),
    status: budgetStatus("status").notNull().default("BROUILLON"),
    /** Date de la réunion du CA qui l'a adopté. */
    adoptedOn: date("adopted_on", { mode: "date" }),
    adoptedBy: text("adopted_by"),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("budgets_year_version_uq").on(t.year, t.version), uniqueIndex("budgets_draft_uq").on(t.year).where(sql`status = 'BROUILLON'`)],
);

/** Une ligne par compte du livre et par commission (commission vide = budget général). */
export const budgetLines = pgTable(
  "budget_lines",
  {
    id: id(),
    budgetId: text("budget_id")
      .notNull()
      .references(() => budgets.id),
    account: text("account").notNull(),
    commissionId: text("commission_id").references(() => commissions.id),
    label: text("label"),
    amount: integer("amount").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("budget_lines_uq").on(t.budgetId, t.account, sql`coalesce(${t.commissionId}, '')`)],
);

/**
 * Pièces de dépense. Statuts, art. 22 : signée par le Trésorier, visée par le CA, puis payée (écriture au journal).
 * Une pièce rejetée reste dans l'historique ; une nouvelle pièce peut être préparée pour la même aide.
 */
export const expenseStatus = pgEnum("expense_status", ["A_SIGNER", "A_VISER", "A_PAYER", "PAYEE", "REJETEE"]);

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    number: serial("number").notNull().unique(),
    label: text("label").notNull(),
    amount: integer("amount").notNull(),
    /** Compte du livre de la future écriture de dépense (`LEDGER_ACCOUNTS`). */
    account: text("account"),
    /** Ligne du budget adopté à laquelle la dépense est imputée (vide = hors budget). */
    budgetLineId: text("budget_line_id").references(() => budgetLines.id),
    solidarityRequestId: text("solidarity_request_id").references(() => solidarityRequests.id),
    status: expenseStatus("status").notNull().default("A_SIGNER"),
    createdBy: text("created_by").notNull(),
    signedBy: text("signed_by"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    visaBy: text("visa_by"),
    visaAt: timestamp("visa_at", { withTimezone: true }),
    rejectedBy: text("rejected_by"),
    rejectReason: text("reject_reason"),
    ledgerEntryId: text("ledger_entry_id")
      .unique()
      .references(() => ledgerEntries.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("expenses_aid_uq").on(t.solidarityRequestId).where(sql`status <> 'REJETEE'`), index("expenses_status_idx").on(t.status)],
);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  target: text("target"),
  details: jsonb("details"),
  createdAt: createdAt(),
});

/** Compteurs pour les numéros lisibles (membres, candidatures, reçus). */
export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Relations (requêtes « db.query.* »)
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ one }) => ({ member: one(members) }));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(user, { fields: [members.userId], references: [user.id] }),
  parent: one(members, { fields: [members.parentId], references: [members.id], relationName: "parent" }),
  sponsor: one(members, { fields: [members.sponsorId], references: [members.id], relationName: "sponsor" }),
  section: one(sections, { fields: [members.sectionId], references: [sections.id] }),
  mandates: many(mandates),
  dues: many(dues),
  payments: many(payments),
  commissions: many(commissionMemberships),
}));

export const mandatesRelations = relations(mandates, ({ one }) => ({
  member: one(members, { fields: [mandates.memberId], references: [members.id] }),
  commission: one(commissions, { fields: [mandates.commissionId], references: [commissions.id] }),
  section: one(sections, { fields: [mandates.sectionId], references: [sections.id] }),
}));

export const commissionsRelations = relations(commissions, ({ many }) => ({
  memberships: many(commissionMemberships),
  mandates: many(mandates),
}));

export const commissionMembershipsRelations = relations(commissionMemberships, ({ one }) => ({
  member: one(members, { fields: [commissionMemberships.memberId], references: [members.id] }),
  commission: one(commissions, { fields: [commissionMemberships.commissionId], references: [commissions.id] }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  sponsor: one(members, { fields: [applications.sponsorId], references: [members.id] }),
  member: one(members, { fields: [applications.memberId], references: [members.id] }),
  documents: many(applicationDocuments),
}));

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(applications, { fields: [applicationDocuments.applicationId], references: [applications.id] }),
}));

export const duesRelations = relations(dues, ({ one }) => ({
  member: one(members, { fields: [dues.memberId], references: [members.id] }),
  payment: one(payments, { fields: [dues.paymentId], references: [payments.id] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  member: one(members, { fields: [payments.memberId], references: [members.id] }),
  dues: many(dues),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(members, { fields: [posts.authorId], references: [members.id] }),
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  post: one(posts, { fields: [eventRegistrations.postId], references: [posts.id] }),
  member: one(members, { fields: [eventRegistrations.memberId], references: [members.id] }),
}));

export const assembliesRelations = relations(assemblies, ({ one, many }) => ({
  president: one(members, { fields: [assemblies.presidentId], references: [members.id], relationName: "president" }),
  secretary: one(members, { fields: [assemblies.secretaryId], references: [members.id], relationName: "secretary" }),
  previous: one(assemblies, { fields: [assemblies.previousId], references: [assemblies.id] }),
  attendances: many(assemblyAttendances),
  resolutions: many(resolutions),
}));

export const assemblyAttendancesRelations = relations(assemblyAttendances, ({ one }) => ({
  assembly: one(assemblies, { fields: [assemblyAttendances.assemblyId], references: [assemblies.id] }),
  member: one(members, { fields: [assemblyAttendances.memberId], references: [members.id] }),
}));

export const solidarityRequestsRelations = relations(solidarityRequests, ({ one }) => ({
  member: one(members, { fields: [solidarityRequests.memberId], references: [members.id] }),
}));

export const budgetsRelations = relations(budgets, ({ many }) => ({
  lines: many(budgetLines),
}));

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  budget: one(budgets, { fields: [budgetLines.budgetId], references: [budgets.id] }),
  commission: one(commissions, { fields: [budgetLines.commissionId], references: [commissions.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  line: one(budgetLines, { fields: [expenses.budgetLineId], references: [budgetLines.id] }),
  aid: one(solidarityRequests, { fields: [expenses.solidarityRequestId], references: [solidarityRequests.id] }),
  creator: one(members, { fields: [expenses.createdBy], references: [members.id], relationName: "expense_creator" }),
  signer: one(members, { fields: [expenses.signedBy], references: [members.id], relationName: "expense_signer" }),
  approver: one(members, { fields: [expenses.visaBy], references: [members.id], relationName: "expense_approver" }),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  author: one(members, { fields: [offers.authorId], references: [members.id] }),
  interests: many(offerInterests),
}));

export const offerInterestsRelations = relations(offerInterests, ({ one }) => ({
  offer: one(offers, { fields: [offerInterests.offerId], references: [offers.id] }),
  member: one(members, { fields: [offerInterests.memberId], references: [members.id] }),
}));

export const commissionRequestsRelations = relations(commissionRequests, ({ one }) => ({
  member: one(members, { fields: [commissionRequests.memberId], references: [members.id] }),
  commission: one(commissions, { fields: [commissionRequests.commissionId], references: [commissions.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  member: one(members, { fields: [conversations.memberId], references: [members.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  author: one(members, { fields: [messages.authorId], references: [members.id] }),
}));

export const exclusionProceduresRelations = relations(exclusionProcedures, ({ one }) => ({
  member: one(members, { fields: [exclusionProcedures.memberId], references: [members.id] }),
}));

export const resolutionsRelations = relations(resolutions, ({ one }) => ({
  assembly: one(assemblies, { fields: [resolutions.assemblyId], references: [assemblies.id] }),
}));
