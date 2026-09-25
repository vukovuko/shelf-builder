import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { signInUrl } from "@/lib/return-to";

/**
 * Admin pages need a signed-in admin. A visitor without a session cookie is
 * sent to sign in and brought back afterwards (e.g. from the link in the
 * "new order" email). A cookie proves nothing by itself, so the admin layout
 * and every admin page still check the role; x-return-to lets them send an
 * expired session to sign in the same way.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const returnTo = pathname + search;
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL(signInUrl(returnTo), request.url));
  }
  const headers = new Headers(request.headers);
  headers.set("x-return-to", returnTo);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/admin/:path*"] };
