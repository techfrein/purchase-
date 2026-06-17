import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "hpv_session";

// Lightweight gate: redirects anonymous visitors to /login. Real session
// validation (DB lookup, role checks) happens in layouts and route handlers.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Public entry pages. Signed-in visitors are sent to the dashboard.
  if (pathname === "/login" || pathname === "/signup") {
    if (hasSession) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Auth endpoints (login, logout, signup) are open.
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Public assets (images, icons) must bypass auth so Next.js image optimization can fetch them.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpe?g|webp|gif|ico)).*)"],
};
