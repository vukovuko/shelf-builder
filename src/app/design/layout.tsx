import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DesignLayoutClient } from "./DesignLayoutClient";

export default async function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch session server-side - no client-side loading state
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Serialize session for client (only pass what's needed)
  const initialSession = session
    ? {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      }
    : null;

  return (
    <DesignLayoutClient initialSession={initialSession}>
      {children}
    </DesignLayoutClient>
  );
}
