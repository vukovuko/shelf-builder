import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signInUrl } from "@/lib/return-to";

/**
 * Sign-in step of the AI-assistant OAuth flow (the mcp plugin's loginPage).
 * Signed in: continue the authorization. Not signed in: the normal sign-in
 * page, which brings the person back here.
 *
 * The plugin would also resume the authorization from a hook on the sign-in
 * request itself, but that request is the sign-in page's background fetch,
 * which can't follow a redirect to the assistant's site; dropping the
 * plugin's cookie leaves it to this route.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const session = await auth.api.getSession({ headers: request.headers });
  const target = session
    ? `/api/auth/mcp/authorize?${query}`
    : signInUrl(`/mcp/prijava?${query}`);
  const response = NextResponse.redirect(new URL(target, url));
  for (const name of ["oidc_login_prompt", "__Secure-oidc_login_prompt"]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}
