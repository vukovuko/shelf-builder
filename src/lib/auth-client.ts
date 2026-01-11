import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
