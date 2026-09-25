import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/SignInPanel";
import { auth } from "@/lib/auth";
import { safeReturnTo } from "@/lib/return-to";

export const metadata: Metadata = {
  title: "Prijava | Ormani po meri",
  robots: { index: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string | string[] }>;
}) {
  const { return_to } = await searchParams;
  const returnTo = safeReturnTo(
    Array.isArray(return_to) ? return_to[0] : return_to,
  );

  // Already signed in (or just back from Google): go where they were
  // headed. That page checks their permissions itself.
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(returnTo);

  return (
    <SignInPanel
      returnTo={returnTo}
      guestHint={returnTo.startsWith("/account")}
    />
  );
}
