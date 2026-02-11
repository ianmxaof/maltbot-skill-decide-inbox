import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protects dashboard and onboarding routes: requires a valid session.
 * Public: /, /signin, /api/auth/*, _next, static, space (public profiles).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — no session required
  if (
    pathname === "/" ||
    pathname === "/signin" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/workers") ||
    pathname === "/api/discover" ||
    (pathname.startsWith("/api/social/space/") && req.method === "GET") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public profile pages — allow unauthenticated view
  if (pathname.startsWith("/space/") && pathname !== "/space") {
    return NextResponse.next();
  }

  // Pair profile page (public)
  if (pathname.startsWith("/pair/") && pathname !== "/pair") {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const signIn = new URL("/signin", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and api/auth
     * We allow / and /signin and /space/:id and /pair/:id in the middleware above.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
