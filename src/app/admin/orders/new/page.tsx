import { db } from "@/db/db";
import { user, materials, wardrobes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { OrderNewClient } from "./OrderNewClient";

export default async function NewOrderPage() {
  const [allUsers, allMaterials, allWardrobes] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email }).from(user),
    db
      .select({
        id: materials.id,
        name: materials.name,
        category: materials.category,
      })
      .from(materials)
      .orderBy(materials.category, materials.name),
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
