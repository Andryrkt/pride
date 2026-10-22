import "server-only";
import { getViewerFromRequest } from "./session";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Authentifie une requête de l'application mobile (cookie de session Better Auth). */
export async function memberFromRequest(req: Request) {
  const v = await getViewerFromRequest(req);
  if (!v?.member || v.member.status !== "ACTIF") return null;
  return v as typeof v & { member: NonNullable<typeof v.member> };
}
