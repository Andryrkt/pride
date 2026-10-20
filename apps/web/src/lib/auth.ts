import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { expo } from "@better-auth/expo";
import { db, schema } from "@pride/db";
import { sendMail } from "./mail";
import { env } from "./env";

export const auth = betterAuth({
  appName: "PRIDe",
  baseURL: env.appUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Pas d'inscription libre : les comptes sont créés après l'agrément du conseil d'administration.
    disableSignUp: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 60 * 60 * 72,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "PRIDe : choisissez votre mot de passe",
        text: `Bonjour ${user.name},\n\nPour choisir (ou changer) le mot de passe de votre espace membre PRIDe, ouvrez ce lien :\n${url}\n\nCe lien est valable 72 heures.\n\nL'équipe PRIDe`,
      });
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  trustedOrigins: [env.appUrl, "pride://", "exp://"],
  plugins: [expo(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
