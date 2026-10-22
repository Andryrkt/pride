import { describe, expect, it } from "vitest";
import { assistantIntent, solidarityAmount, normalizePhone, agCanDeliberate, agrementAdopted, canVoteAtAG, convocationDelay, resolutionAdopted, voteValid, exclusionAdopted, formatAriary, isMinor, mandateActive, mandateEnd, memberNumber, periodsBetween, quorumAG, sectionSplit } from "./rules";
import { applicationSchema } from "./schemas";

describe("règles des statuts", () => {
  it("agrément : majorité des présents", () => {
    expect(agrementAdopted(3, 5)).toBe(true);
    expect(agrementAdopted(2, 5)).toBe(false);
    expect(agrementAdopted(2, 4)).toBe(false);
    expect(agrementAdopted(6, 5)).toBe(false);
  });
  it("exclusion : deux tiers des présents", () => {
    expect(exclusionAdopted(4, 6)).toBe(true);
    expect(exclusionAdopted(3, 6)).toBe(false);
    expect(exclusionAdopted(5, 7)).toBe(true);
  });
  it("quorum de l'AG", () => {
    expect(quorumAG(42)).toBe(22);
    expect(quorumAG(41)).toBe(21);
  });
  it("sections : 90 / 10", () => {
    expect(sectionSplit(50_000)).toEqual({ section: 45_000, association: 5_000 });
  });
  it("formats", () => {
    expect(formatAriary(10000)).toBe("10 000 Ar");
    expect(memberNumber(2026, 42)).toBe("PR-2026-0042");
    expect(periodsBetween(new Date(2026, 10, 15), new Date(2027, 1, 1))).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
  it("mandats : durée et période en cours", () => {
    const start = new Date("2026-09-27");
    expect(mandateEnd(start, 1).toISOString().slice(0, 10)).toBe("2027-09-27");
    expect(mandateEnd(start, 5).toISOString().slice(0, 10)).toBe("2031-09-27");
    const m = { startsAt: start, endsAt: mandateEnd(start, 1) };
    expect(mandateActive(m, new Date("2026-09-26T12:00:00Z"))).toBe(false);
    expect(mandateActive(m, new Date("2026-09-27T12:00:00Z"))).toBe(true);
    expect(mandateActive(m, new Date("2027-09-27T12:00:00Z"))).toBe(true);
    expect(mandateActive(m, new Date("2027-09-28T12:00:00Z"))).toBe(false);
    expect(mandateActive({ startsAt: start, endsAt: null }, new Date("2040-01-01"))).toBe(true);
  });
  it("AG : droit de vote", () => {
    const on = new Date("2026-10-15");
    expect(canVoteAtAG({ status: "ACTIF", category: "ACTIF", birthDate: "1990-01-01" }, on)).toBe(true);
    expect(canVoteAtAG({ status: "ACTIF", category: "ACTIF", birthDate: null }, on)).toBe(true);
    expect(canVoteAtAG({ status: "ACTIF", category: "ACTIF_MINEUR", birthDate: "2012-01-01" }, on)).toBe(false);
    expect(canVoteAtAG({ status: "ACTIF", category: "ACTIF", birthDate: "2012-01-01" }, on)).toBe(false);
    expect(canVoteAtAG({ status: "ACTIF", category: "BIENFAITEUR", birthDate: "1980-01-01" }, on)).toBe(false);
    expect(canVoteAtAG({ status: "EXCLU", category: "ACTIF", birthDate: "1980-01-01" }, on)).toBe(false);
  });
  it("AG : quorum et deuxième convocation", () => {
    expect(agCanDeliberate(22, 42, 1)).toBe(true);
    expect(agCanDeliberate(21, 42, 1)).toBe(false);
    expect(agCanDeliberate(3, 42, 2)).toBe(true);
  });
  it("AG : délai de convocation de 15 jours", () => {
    expect(convocationDelay(new Date("2026-10-01T18:00:00Z"), new Date("2026-10-16T08:00:00Z"))).toEqual({ days: 15, late: false });
    expect(convocationDelay(new Date("2026-10-02T08:00:00Z"), new Date("2026-10-16T08:00:00Z"))).toEqual({ days: 14, late: true });
  });
  it("AG : majorités des résolutions", () => {
    expect(resolutionAdopted("SIMPLE", { pour: 5, contre: 4, abstention: 11 }, 20)).toBe(true);
    expect(resolutionAdopted("SIMPLE", { pour: 4, contre: 4, abstention: 0 }, 8)).toBe(false);
    expect(resolutionAdopted("ABSOLUE", { pour: 10, contre: 2, abstention: 8 }, 20)).toBe(false);
    expect(resolutionAdopted("ABSOLUE", { pour: 11, contre: 2, abstention: 7 }, 20)).toBe(true);
    expect(resolutionAdopted("DEUX_TIERS", { pour: 14, contre: 6, abstention: 0 }, 21)).toBe(true);
    expect(resolutionAdopted("DEUX_TIERS", { pour: 13, contre: 0, abstention: 0 }, 21)).toBe(false);
    expect(voteValid({ pour: 15, contre: 6, abstention: 1 }, 21)).toBe(false);
    expect(resolutionAdopted("SIMPLE", { pour: 15, contre: 6, abstention: 1 }, 21)).toBe(false);
  });
  it("mineur", () => {
    expect(isMinor(new Date(2010, 0, 1), new Date(2026, 9, 14))).toBe(true);
    expect(isMinor(new Date(2000, 0, 1), new Date(2026, 9, 14))).toBe(false);
  });
});

describe("candidature", () => {
  const base = {
    lastName: "RAKOTO", firstNames: "Hery", birthDate: "1998-04-02", phone: "034 12 345 67",
    address: "Analamahitsy", sponsorship: "ENTRETIEN", consent: true,
  };
  it("accepte une candidature majeure valide", () => {
    expect(applicationSchema.safeParse(base).success).toBe(true);
  });
  it("exige le parent pour un mineur", () => {
    const r = applicationSchema.safeParse({ ...base, birthDate: "2012-01-01" });
    expect(r.success).toBe(false);
  });
  it("exige le parrain si parrainage choisi", () => {
    const r = applicationSchema.safeParse({ ...base, sponsorship: "PARRAIN" });
    expect(r.success).toBe(false);
  });
  it("refuse un téléphone invalide", () => {
    expect(applicationSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
  });
  it("numéro de téléphone normalisé", () => {
    expect(normalizePhone("034 12 345 67")).toBe("0341234567");
    expect(normalizePhone("+261 34 12 345 67")).toBe("0341234567");
    expect(normalizePhone("+261341234567")).toBe("0341234567");
  });
  it("aide de solidarité : 50 000 Ar au membre, 25 000 Ar à la famille", () => {
    expect(solidarityAmount("MEMBRE")).toBe(50_000);
    expect(solidarityAmount("FAMILLE")).toBe(25_000);
  });
  it("assistant : sujet de la question par mots-clés", () => {
    expect(assistantIntent("Combien je dois payer pour ma cotisation ?")).toBe("COTISATION");
    expect(assistantIntent("Prochaines formations")).toBe("FORMATION");
    expect(assistantIntent("Naissance de ma fille")).toBe("SOLIDARITE");
    expect(assistantIntent("Quand a lieu l'AG ?")).toBe("AG");
    expect(assistantIntent("ASSEMBLÉE GÉNÉRALE")).toBe("AG");
    expect(assistantIntent("Ma carte de membre")).toBe("CARTE");
    expect(assistantIntent("Je veux parler au trésorier de ma cotisation")).toBe("RESPONSABLE");
    expect(assistantIntent("Merci beaucoup")).toBe("MERCI");
    expect(assistantIntent("Bonjour")).toBe("INCONNU");
  });
});
