export const APPLICATION_STATUS: Record<string, [string, "green" | "yellow" | "red" | "gray" | "dark"]> = {
  SOUMISE: ["Parrainage à vérifier", "yellow"],
  ENTRETIEN: ["Entretien", "yellow"],
  VOTE_CA: ["Vote du CA", "yellow"],
  AGREEE: ["Agréée : fiche à créer", "green"],
  REFUSEE: ["Refusée", "red"],
  MEMBRE: ["Membre", "dark"],
};

export const MEMBER_STATUS: Record<string, [string, "green" | "yellow" | "red" | "gray" | "dark"]> = {
  ACTIF: ["Actif", "green"],
  DEMISSIONNAIRE: ["Démissionnaire", "gray"],
  EXCLU: ["Exclu", "red"],
  DECEDE: ["Décédé", "dark"],
};
