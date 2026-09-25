"use client";

import { useRouter } from "next/navigation";
import { AuthForms } from "@/components/AuthForms";

/**
 * Full-page sign-in. With `returnTo` the visitor goes there afterwards (the
 * page itself decides whether they may see it); without it the current page
 * re-renders, e.g. an account page opened from an order email.
 */
export function SignInPanel({
  returnTo,
  guestHint = false,
}: {
  returnTo?: string;
  guestHint?: boolean;
}) {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 font-bold text-2xl">Prijavite se</h1>
      {/* Guest checkout creates the account without a password. */}
      {guestHint && (
        <p className="mb-4 text-muted-foreground text-sm">
          Poručili ste bez lozinke? Kliknite „Zaboravili ste lozinku?“ i
          postavite je preko emaila sa porudžbine.
        </p>
      )}
      <AuthForms
        onSuccess={() =>
          returnTo ? router.replace(returnTo) : router.refresh()
        }
      />
    </main>
  );
}
