import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { orders, materials, wardrobes } from "@/db/schema";
import { OrderDetailClient } from "./OrderDetailClient";

// Disable caching to always show fresh wardrobe data
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      // Customer info from the order (what was entered during checkout)
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      // Shipping address
      shippingStreet: orders.shippingStreet,
      shippingApartment: orders.shippingApartment,
      shippingCity: orders.shippingCity,
      shippingPostalCode: orders.shippingPostalCode,
      wardrobeId: orders.wardrobeId,
      wardrobeName: wardrobes.name,
      materialId: orders.materialId,
      materialName: materials.name,
      frontMaterialId: orders.frontMaterialId,
      backMaterialId: orders.backMaterialId,
      area: orders.area,
      totalPrice: orders.totalPrice,
      priceBreakdown: orders.priceBreakdown,
      cutList: orders.cutList,
      ruleAdjustments: orders.ruleAdjustments,
      adjustedTotal: orders.adjustedTotal,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      returnStatus: orders.returnStatus,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .leftJoin(wardrobes, eq(orders.wardrobeId, wardrobes.id))
    .leftJoin(materials, eq(orders.materialId, materials.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    notFound();
  }

  // Get front and back material names
  let frontMaterialName: string | null = null;
  let backMaterialName: string | null = null;

  if (order.frontMaterialId) {
    const [frontMat] = await db
      .select({ name: materials.name })
      .from(materials)
      .where(eq(materials.id, order.frontMaterialId))
      .limit(1);
    frontMaterialName = frontMat?.name ?? null;
  }

  if (order.backMaterialId) {
    const [backMat] = await db
      .select({ name: materials.name })
      .from(materials)
      .where(eq(materials.id, order.backMaterialId))
      .limit(1);
    backMaterialName = backMat?.name ?? null;
  }

  // Fetch wardrobe data for 3D preview
  let wardrobeData: Record<string, unknown> | null = null;
  if (order.wardrobeId) {
    const [wardrobeRecord] = await db
      .select({ data: wardrobes.data })
      .from(wardrobes)
      .where(eq(wardrobes.id, order.wardrobeId))
      .limit(1);
    wardrobeData = wardrobeRecord?.data ?? null;
  }

  // Fetch all materials for 3D scene
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
    <OrderDetailClient
      order={{
        ...order,
        frontMaterialName,
        backMaterialName,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      }}
      wardrobeData={wardrobeData}
      materials={serializedMaterials}
    />
  );
}
