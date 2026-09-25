import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MAIN_ORIGIN } from "@/lib/todo/host";

// Second half of the login handoff (see lib/todo/host): trades the one-time
// token for this host's session cookie, which nextCookies() adds to the
// response.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  try {
    if (!token) throw new Error("missing token");
    await auth.api.verifyOneTimeToken({ body: { token } });
    return NextResponse.redirect(new URL("/", request.url));
  } catch {
    // Expired or already used: the board on the main site still works.
    return NextResponse.redirect(`${MAIN_ORIGIN}/admin/todo`);
  }
}
