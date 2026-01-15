import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
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
    price: m.price,
    img: m.img,
    thickness: m.thickness,
    stock: m.stock,
    categories: m.categories,
    published: m.published,
  }));

  return (
    <DesignLayoutClient
      initialSession={initialSession}
      initialMaterials={serializedMaterials}
    >
      {children}
    </DesignLayoutClient>
  );
}
