import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

export type MailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

/** Envoie un e-mail (SMTP réel, Mailpit en développement, ou affichage console si SMTP_HOST est vide). */
export async function sendMail(input: MailInput) {
  const info = await getTransporter().sendMail({ from: env.mailFrom, ...input });
  if (!process.env.SMTP_HOST) {
    console.info(`[e-mail simulé] à ${input.to} : ${input.subject}`);
  }
  return info;
}
