import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountClient } from "./AccountClient";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <AccountClient
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        phone: session.user.phone,
        createdAt: session.user.createdAt,
        emailVerified: session.user.emailVerified,
      }}
    />
  );
}
