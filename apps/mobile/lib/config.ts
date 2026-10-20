import Constants from "expo-constants";

/**
 * Adresse du serveur PRIDe.
 * - Développement sur téléphone : l'adresse IP de l'ordinateur (ex. http://192.168.1.20:3000), via EXPO_PUBLIC_API_URL.
 * - Production : https://pride.mg
 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:3000";
