import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { UserDetailClient } from "./UserDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch user
  const [userData] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, id));

  if (!userData) {
    notFound();
  }

  // Fetch wardrobe count
  const [wardrobeCount] = await db
    .select({ count: count() })
    .from(wardrobes)
    .where(eq(wardrobes.userId, id));

  // Fetch user's wardrobes
  const userWardrobes = await db
    .select({
      id: wardrobes.id,
      name: wardrobes.name,
      createdAt: wardrobes.createdAt,
      updatedAt: wardrobes.updatedAt,
    })
    .from(wardrobes)
    .where(eq(wardrobes.userId, id));

  const serializedUser = {
    ...userData,
    createdAt: userData.createdAt.toISOString(),
    updatedAt: userData.updatedAt.toISOString(),
    wardrobeCount: wardrobeCount?.count ?? 0,
    wardrobes: userWardrobes.map((w) => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  };

  return <UserDetailClient user={serializedUser} />;
}
