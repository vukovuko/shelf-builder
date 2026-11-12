import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";
import { emitSessionChange } from "./session-events";

// In the browser auth is always same-origin, whatever host serves the app
// (production, a workers.dev build, localhost). The env value only matters
// while rendering on the server.
const getBaseURL = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [adminClient(), inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

authClient.$store.atoms.$sessionSignal.listen(emitSessionChange);
