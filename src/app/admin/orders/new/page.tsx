import { desc } from "drizzle-orm";
import { db } from "@/db/db";
import { materials, user, wardrobes } from "@/db/schema";
import { requireAdminPage } from "@/lib/roles";
import { OrderNewClient } from "./OrderNewClient";

export default async function NewOrderPage() {
  await requireAdminPage();
  const [allUsers, allMaterials, allWardrobes] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user),
    db
      .select({
        id: materials.id,
        name: materials.name,
        categories: materials.categories,
      })
      .from(materials)
      .orderBy(materials.name),
    db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        userId: wardrobes.userId,
      })
      .from(wardrobes)
      .orderBy(desc(wardrobes.createdAt)),
  ]);

  return (
    <OrderNewClient
      users={allUsers}
      materials={allMaterials}
      wardrobes={allWardrobes}
    />
  );
}
