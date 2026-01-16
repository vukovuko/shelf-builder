import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { materials, user } from "@/db/schema";
import { DesignLayoutClient } from "./DesignLayoutClient";

export default async function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch session and materials in parallel (only published materials for design page)
  const [session, dbMaterials] = await Promise.all([
    auth.api.getSession({
      headers: await headers(),
    }),
    db.select().from(materials).where(eq(materials.published, true)),
  ]);

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

  // Serialize materials for client
  const serializedMaterials = dbMaterials.map((m) => ({
    id: m.id,
    name: m.name,
    productCode: m.productCode,
    price: m.price,
    costPrice: m.costPrice,
    img: m.img,
    thickness: m.thickness,
    stock: m.stock,
    categories: m.categories,
    published: m.published,
  }));

  // Check if user is admin
  let isAdmin = false;
  if (session?.user?.id) {
    const dbUser = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    isAdmin = dbUser[0]?.role === "admin";
  }

  return (
    <DesignLayoutClient
      initialSession={initialSession}
      initialMaterials={serializedMaterials}
      isAdmin={isAdmin}
    >
      {children}
    </DesignLayoutClient>
  );
}
