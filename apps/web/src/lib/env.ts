/** Variables d'environnement lues côté serveur, avec des valeurs de développement par défaut. */
export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  mailFrom: process.env.MAIL_FROM ?? "PRIDe <no-reply@pride.mg>",
  mailAssociation: process.env.MAIL_ASSOCIATION ?? "association4pride@gmail.com",
  paymentsMode: (process.env.PAYMENTS_MODE ?? "simulation") as "simulation" | "reel",
  /** Premier mois pour lequel l'application calcule les cotisations (évite des arriérés fictifs). */
  duesStartPeriod: process.env.DUES_START_PERIOD ?? "2026-10",
};
