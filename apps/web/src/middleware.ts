import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Redirige vers la connexion si aucune session n'est présente (vérification complète dans les pages). */
export function middleware(req: NextRequest) {
  if (!getSessionCookie(req)) {
    const url = new URL("/connexion", req.url);
    url.searchParams.set("suite", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/membre/:path*", "/dirigeants/:path*"] };
