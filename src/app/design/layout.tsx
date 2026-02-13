import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import {
  materials,
  handles,
  handleFinishes,
  accessories,
  accessoryVariants,
  user,
} from "@/db/schema";
import { DesignLayoutClient } from "./DesignLayoutClient";

export default async function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch session, materials, and handles in parallel (only published for design page)
  const [session, dbMaterials, dbHandles, dbAccessories] = await Promise.all([
    auth.api.getSession({
      headers: await headers(),
    }),
    db.select().from(materials).where(eq(materials.published, true)),
    db.select().from(handles).where(eq(handles.published, true)),
    db.select().from(accessories).where(eq(accessories.published, true)),
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

  // Fetch finishes for each handle and serialize
  const serializedHandles = await Promise.all(
    dbHandles.map(async (h) => {
      const finishes = await db
        .select()
        .from(handleFinishes)
        .where(eq(handleFinishes.handleId, h.id));

      return {
        id: h.id,
        legacyId: h.legacyId,
        name: h.name,
        description: h.description,
        mainImage: h.mainImage,
        published: h.published,
        finishes: finishes.map((f) => ({
          id: f.id,
          handleId: f.handleId,
          legacyId: f.legacyId,
          name: f.name,
          image: f.image,
          price: f.price,
          costPrice: f.costPrice,
        })),
      };
    }),
  );

  // Fetch variants for each accessory and serialize
  const serializedAccessories = await Promise.all(
    dbAccessories.map(async (a) => {
      const variants = await db
        .select()
        .from(accessoryVariants)
        .where(eq(accessoryVariants.accessoryId, a.id));

      return {
        id: a.id,
        name: a.name,
        description: a.description,
        mainImage: a.mainImage,
        published: a.published,
        pricingRule: a.pricingRule,
        qtyPerUnit: a.qtyPerUnit,
        variants: variants.map((v) => ({
          id: v.id,
          accessoryId: v.accessoryId,
          name: v.name,
          image: v.image,
          price: v.price,
          costPrice: v.costPrice,
        })),
      };
    }),
  );

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
      initialHandles={serializedHandles}
      initialAccessories={serializedAccessories}
      isAdmin={isAdmin}
    >
      {children}
    </DesignLayoutClient>
  );
}
