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
    number: text("number").notNull().unique(), // PR-2026-0042
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
    category: memberCategory("category").notNull().default("ACTIF"),
    status: memberStatus("status").notNull().default("ACTIF"),
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
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Actualités, événements, contact, traçabilité
// ---------------------------------------------------------------------------

export const postType = pgEnum("post_type", ["ARTICLE", "EVENEMENT", "ANNONCE"]);
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
export const solidarityStatus = pgEnum("solidarity_status", ["DEMANDEE", "ACCORDEE", "REFUSEE"]);

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
    createdAt: createdAt(),
  },
  // Une même déclaration envoyée deux fois ne crée qu'une demande.
  (t) => [uniqueIndex("solidarity_requests_uq").on(t.memberId, t.kind, t.concerns, t.eventDate), index("solidarity_requests_status_idx").on(t.status)],
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

export const resolutionsRelations = relations(resolutions, ({ one }) => ({
  assembly: one(assemblies, { fields: [resolutions.assemblyId], references: [assemblies.id] }),
}));
