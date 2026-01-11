import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { WardrobesClient } from "./WardrobesClient";

export default async function WardrobesPage() {
  // Layout already checks admin access
  const allWardrobes = await db
    .select({
      id: wardrobes.id,
      name: wardrobes.name,
      thumbnail: wardrobes.thumbnail,
      createdAt: wardrobes.createdAt,
      updatedAt: wardrobes.updatedAt,
      userId: wardrobes.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(wardrobes)
    .leftJoin(user, eq(wardrobes.userId, user.id))
    .orderBy(desc(wardrobes.createdAt));

  // Convert dates to strings for serialization
  const serializedWardrobes = allWardrobes.map((w) => ({
    ...w,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));

  return <WardrobesClient wardrobes={serializedWardrobes} />;
}
