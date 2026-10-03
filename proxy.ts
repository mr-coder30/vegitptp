import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin pages
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminCookie = request.cookies.get("vegitptp-admin")?.value;

    if (adminCookie !== "authenticated") {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};