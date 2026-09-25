"use client";

import { useRouter } from "next/navigation";
import { AuthForms } from "@/components/AuthForms";

/**
 * Shown on any account page when nobody is logged in, e.g. after clicking
 * "Pogledajte porudžbinu" in an order email. Logging in re-renders the same
 * page, so the buyer lands on the order they came for.
 */
export function AccountSignIn() {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 font-bold text-2xl">Prijavite se</h1>
      {/* Guest checkout creates the account without a password. */}
      <p className="mb-4 text-muted-foreground text-sm">
        Poručili ste bez lozinke? Kliknite „Zaboravili ste lozinku?“ i postavite
        je preko emaila sa porudžbine.
      </p>
      <AuthForms onSuccess={() => router.refresh()} />
    </main>
  );
}
