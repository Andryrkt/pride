import "server-only";
import { notFound } from "next/navigation";
import { GUIDES, isGuide } from "@/content/guides";
import { requireDirigeant } from "./session";

/** Guide demandé dans l'adresse ; le guide des dirigeants n'est ouvert qu'aux dirigeants connectés. */
export async function guideFor(key: string) {
  if (!isGuide(key)) notFound();
  const guide = GUIDES[key];
  if (guide.dirigeants) await requireDirigeant();
  return { key, ...guide };
}
