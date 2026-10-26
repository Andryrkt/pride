import { GUIDE_CANDIDATS } from "./guide-candidats";
import { GUIDE_DIRIGEANTS } from "./guide-dirigeants";
import { GUIDE_MEMBRES } from "./guide-membres";

export type GuideStep = { text: string; image?: string };
export type GuidePage = { slug: string; title: string; summary: string; steps: GuideStep[]; tips?: string[]; links?: { label: string; href: string }[] };

/**
 * Les guides d'utilisation (pages /aide). Les captures d'écran de chaque guide sont dans public/aide/<clé>
 * et se régénèrent avec : node tests/captures-aide.mjs
 * `dirigeants` : guide réservé aux dirigeants (procédures internes).
 */
export const GUIDES = {
  candidats: { title: "Guide des candidats", intro: "Devenir membre de PRIDe : la candidature en ligne, puis les premières étapes après l'agrément.", pages: GUIDE_CANDIDATS, dirigeants: false },
  membres: { title: "Guide des membres", intro: "Comment utiliser votre espace membre, étape par étape.", pages: GUIDE_MEMBRES, dirigeants: false },
  dirigeants: { title: "Guide des dirigeants", intro: "Les procédures de l'espace dirigeants : adhésions, registre, AG, demandes des membres.", pages: GUIDE_DIRIGEANTS, dirigeants: true },
} as const;

export type GuideKey = keyof typeof GUIDES;
export const isGuide = (k: string): k is GuideKey => k in GUIDES;
