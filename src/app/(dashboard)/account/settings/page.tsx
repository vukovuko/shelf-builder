import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { AccountClient } from "./AccountClient";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  // Fetch full user data including shipping address
  const [userData] = await db
    .select({
      shippingStreet: user.shippingStreet,
      shippingApartment: user.shippingApartment,
      shippingCity: user.shippingCity,
      shippingPostalCode: user.shippingPostalCode,
      receiveNewsletter: user.receiveNewsletter,
    })
    .from(user)
    .where(eq(user.id, session.user.id));

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
        shippingStreet: userData?.shippingStreet ?? null,
        shippingApartment: userData?.shippingApartment ?? null,
        shippingCity: userData?.shippingCity ?? null,
        shippingPostalCode: userData?.shippingPostalCode ?? null,
        receiveNewsletter: userData?.receiveNewsletter ?? false,
      }}
    />
  );
}
