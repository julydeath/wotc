import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "./app/lib/auth";

const PUBLIC_PATHS = ["/api/login", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next internal assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
  const isAuthenticated = await verifySessionToken(token);

  // Login page: if already authenticated, go straight to /credits
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/credits", request.url));
    }
    return NextResponse.next();
  }

  // Public routes (login API, favicon, etc.)
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Everything else must be authenticated
  if (!isAuthenticated) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

