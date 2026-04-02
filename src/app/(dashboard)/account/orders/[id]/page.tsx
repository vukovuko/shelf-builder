import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { db } from "@/db/db";
import { orders, materials, wardrobes, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { OrderDetailClient } from "./OrderDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  // Get user's phone for matching
  const [currentUser] = await db
    .select({ phone: user.phone })
    .from(user)
    .where(eq(user.id, session.user.id));

  // Fetch order
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      shippingStreet: orders.shippingStreet,
      shippingApartment: orders.shippingApartment,
      shippingCity: orders.shippingCity,
      shippingPostalCode: orders.shippingPostalCode,
      wardrobeId: orders.wardrobeId,
      wardrobeName: wardrobes.name,
      materialName: materials.name,
      frontMaterialId: orders.frontMaterialId,
      backMaterialId: orders.backMaterialId,
      area: orders.area,
      totalPrice: orders.totalPrice,
      priceBreakdown: orders.priceBreakdown,
      adjustedTotal: orders.adjustedTotal,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(wardrobes, eq(orders.wardrobeId, wardrobes.id))
    .leftJoin(materials, eq(orders.materialId, materials.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    notFound();
  }

  // Verify this order belongs to the user (same logic as orders list page)
  const isOwner =
    order.userId === session.user.id ||
    (session.user.email && order.customerEmail === session.user.email) ||
    (currentUser?.phone && order.customerPhone === currentUser.phone);

  if (!isOwner) {
    notFound();
  }

  // Get front and back material names
  let frontMaterialName: string | null = null;
  let backMaterialName: string | null = null;
  const edgeMaterialName =
    order.priceBreakdown?.edge?.materialName ??
    order.priceBreakdown?.edge?.carcass?.materialName ??
    order.priceBreakdown?.edge?.front?.materialName ??
    null;

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
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingStreet: order.shippingStreet,
        shippingApartment: order.shippingApartment,
        shippingCity: order.shippingCity,
        shippingPostalCode: order.shippingPostalCode,
        wardrobeName: order.wardrobeName,
        materialName: order.materialName,
        frontMaterialName,
        backMaterialName,
        edgeMaterialName,
        area: order.area,
        totalPrice: order.totalPrice,
        priceBreakdown: order.priceBreakdown,
        adjustedTotal: order.adjustedTotal,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        createdAt: order.createdAt.toISOString(),
      }}
      wardrobeData={wardrobeData}
      materials={serializedMaterials}
    />
  );
}
