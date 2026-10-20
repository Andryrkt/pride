import "server-only";
import type { PaymentProviderId } from "@pride/shared";
import { env } from "./env";

export type InitiateResult = { providerRef: string; status: "EN_ATTENTE" | "REUSSI" | "ECHOUE" };

export interface PaymentProvider {
  /** Demande de paiement : l'opérateur envoie une notification au téléphone du membre. */
  initiate(input: { paymentId: string; amount: number; phone: string; description: string }): Promise<InitiateResult>;
}

/** Simulation : tous les paiements réussissent tout de suite (développement, démonstrations). */
const simulation: PaymentProvider = {
  async initiate({ paymentId }) {
    return { providerRef: `SIM-${paymentId.slice(0, 8)}`, status: "REUSSI" };
  },
};

/**
 * Opérateur réel : à brancher sur l'API marchande (MVola Merchant Pay, Orange Money Web Payment, Airtel Money).
 * L'opérateur confirme ensuite le paiement sur /api/paiements/notification/[operateur], qui appelle confirmPayment().
 */
function notConfigured(name: string): PaymentProvider {
  return {
    async initiate() {
      throw new Error(`Paiement ${name} non configuré : renseignez les identifiants marchands ou utilisez PAYMENTS_MODE=simulation.`);
    },
  };
}

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  if (env.paymentsMode === "simulation") return simulation;
  switch (id) {
    case "MVOLA":
      return notConfigured("MVola");
    case "ORANGE_MONEY":
      return notConfigured("Orange Money");
    case "AIRTEL_MONEY":
      return notConfigured("Airtel Money");
  }
}
