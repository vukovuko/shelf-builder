import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { wardrobes, user, materials } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/roles";
import { WardrobePreviewClient } from "./WardrobePreviewClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminWardrobePreviewPage({ params }: PageProps) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser.role)) {
    redirect("/");
  }

  // Fetch wardrobe with owner info
  const [wardrobe] = await db
    .select({
      id: wardrobes.id,
      name: wardrobes.name,
      data: wardrobes.data,
      thumbnail: wardrobes.thumbnail,
      cutList: wardrobes.cutList,
      createdAt: wardrobes.createdAt,
      updatedAt: wardrobes.updatedAt,
      userId: wardrobes.userId,
      userName: user.name,
      userEmail: user.email,
      isModel: wardrobes.isModel,
    })
    .from(wardrobes)
    .leftJoin(user, eq(wardrobes.userId, user.id))
    .where(eq(wardrobes.id, id))
    .limit(1);

  if (!wardrobe) {
    notFound();
  }

  // Fetch all materials
  const dbMaterials = await db.select().from(materials);

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

  return (
    <WardrobePreviewClient
      wardrobe={{
        id: wardrobe.id,
        name: wardrobe.name,
        data: wardrobe.data as Record<string, unknown>,
        thumbnail: wardrobe.thumbnail,
        cutList: wardrobe.cutList as {
          items: Array<{
            code: string;
            desc: string;
            widthCm: number;
            heightCm: number;
            thicknessMm: number;
            areaM2: number;
            cost: number;
            element: string;
            materialType: "korpus" | "front" | "back";
          }>;
          pricePerM2: number;
          frontPricePerM2: number;
          backPricePerM2: number;
          totalArea: number;
          totalCost: number;
        } | null,
        createdAt: wardrobe.createdAt.toISOString(),
        updatedAt: wardrobe.updatedAt.toISOString(),
        userName: wardrobe.userName,
        userEmail: wardrobe.userEmail,
        isModel: wardrobe.isModel,
      }}
      materials={serializedMaterials}
    />
  );
}
