import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

/** Connexion des membres : la session est gardée dans le stockage sécurisé du téléphone. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoClient({ scheme: "pride", storagePrefix: "pride", storage: SecureStore })],
});
