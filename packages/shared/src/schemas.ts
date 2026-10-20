import { z } from "zod";
import { PAYMENT_PROVIDERS } from "./constants";

const phone = z
  .string({ required_error: "Téléphone : champ obligatoire" })
  .trim()
  .regex(/^(\+261|0)\s?3[2-9](\s?\d){7}$/, "Numéro de téléphone malgache invalide (ex. : 034 12 345 67)");

const required = (label: string) =>
  z.string({ required_error: `${label} : champ obligatoire` }).trim().min(1, `${label} : champ obligatoire`);

/** Fiche de renseignement (candidature en ligne). Les pièces jointes sont validées à part. */
export const applicationSchema = z
  .object({
    lastName: required("Nom").max(80),
    firstNames: required("Prénoms").max(120),
    birthDate: z.coerce.date({ errorMap: () => ({ message: "Date de naissance : champ obligatoire" }) }),
    phone,
    email: z.string().trim().email("E-mail invalide").optional().or(z.literal("").transform(() => undefined)),
    address: required("Quartier / ville").max(160),
    profession: z.string().trim().max(120).optional(),
    skills: z.string().trim().max(300).optional(),
    expectations: z.string().trim().max(2000).optional(),
    category: z.enum(["ACTIF", "BIENFAITEUR"]).default("ACTIF"),
    sponsorship: z.enum(["PARRAIN", "ENTRETIEN"], { errorMap: () => ({ message: "Parrainage : choisissez une option" }) }),
    sponsorMemberId: z.string().optional(),
    parentName: z.string().trim().max(120).optional(),
    parentMemberNumber: z.string().trim().max(20).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter l'utilisation de vos données." }) }),
  })
  .superRefine((v, ctx) => {
    if (v.sponsorship === "PARRAIN" && !v.sponsorMemberId) {
      ctx.addIssue({ code: "custom", path: ["sponsorMemberId"], message: "Choisissez votre parrain." });
    }
    const today = new Date();
    let age = today.getFullYear() - v.birthDate.getFullYear();
    const m = today.getMonth() - v.birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < v.birthDate.getDate())) age--;
    if (age < 0 || age > 120) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Date de naissance invalide." });
    if (age < 18) {
      if (!v.parentName) ctx.addIssue({ code: "custom", path: ["parentName"], message: "Nom du parent ou tuteur membre : obligatoire pour un mineur." });
      if (!v.parentMemberNumber) ctx.addIssue({ code: "custom", path: ["parentMemberNumber"], message: "Numéro de membre du parent : obligatoire pour un mineur." });
    }
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Formulaire de contact public : toujours adressé à l'association. */
export const contactSchema = z.object({
  name: required("Nom").max(120),
  email: z.string({ required_error: "E-mail : champ obligatoire" }).trim().email("E-mail invalide"),
  phone: z.string().trim().max(30).optional(),
  subject: required("Objet").max(160),
  message: required("Message").max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Inscription d'un visiteur (sans compte) à un événement public. */
export const eventRegistrationSchema = z.object({
  name: required("Nom et prénom").max(120),
  phone,
});

/** Délibération du conseil d'administration sur une candidature. */
export const agrementSchema = z
  .object({
    meetingDate: z.coerce.date(),
    presents: z.coerce.number().int().min(1).max(7),
    pour: z.coerce.number().int().min(0).max(7),
    contre: z.coerce.number().int().min(0).max(7),
  })
  .refine((v) => v.pour + v.contre <= v.presents, { message: "Plus de votes que de membres présents.", path: ["pour"] });

export const paymentRequestSchema = z.object({
  dueIds: z.array(z.string().min(1)).min(1, "Choisissez au moins une échéance à payer."),
  provider: z.enum(Object.keys(PAYMENT_PROVIDERS) as [keyof typeof PAYMENT_PROVIDERS, ...(keyof typeof PAYMENT_PROVIDERS)[]]),
  phone,
});

export type PaymentRequest = z.infer<typeof paymentRequestSchema>;

export const profileSchema = z.object({
  phone,
  address: required("Quartier / ville").max(160),
  profession: z.string().trim().max(120).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(15),
});
