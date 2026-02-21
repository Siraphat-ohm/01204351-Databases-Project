import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  // // 1. Fast edge-safe cookie check — avoid hitting the DB if no session exists
  // const sessionCookie = getSessionCookie(request);
  // if (!sessionCookie) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  // // 2. Full session fetch from your Node.js API route (has Prisma, role info, etc.)
  // const sessionRes = await fetch(
  //   new URL("/api/auth/get-session", request.url),
  //   {
  //     headers: { cookie: request.headers.get("cookie") ?? "" },
  //   },
  // );

  // const session = sessionRes.ok ? await sessionRes.json() : null;

  // if (!session?.user) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  // const { pathname } = request.nextUrl;
  // const userRole = session.user.role as string;

  // if (pathname.startsWith("/admin") && userRole !== "ADMIN") {
  //   return NextResponse.redirect(new URL("/unauthorized", request.url));
  // }

  // if (pathname.startsWith("/flight-ops")) {
  //   const allowed = ["PILOT", "CABIN_CREW", "ADMIN"];
  //   if (!allowed.includes(userRole)) {
  //     return NextResponse.redirect(new URL("/unauthorized", request.url));
  //   }
  // }

  // if (pathname.startsWith("/ground-ops")) {
  //   const allowed = ["GROUND_STAFF", "MECHANIC", "ADMIN"];
  //   if (!allowed.includes(userRole)) {
  //     return NextResponse.redirect(new URL("/unauthorized", request.url));
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/flight-ops/:path*",
    "/ground-ops/:path*",
    "/dashboard/:path*",
  ],
};
