import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/db";
import { wardrobes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { WardrobesClient } from "./WardrobesClient";

export default async function WardrobesPage() {
  // Check session server-side - no client-side flickering
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to home if not logged in
  if (!session) {
    redirect("/");
  }

  // Fetch wardrobes server-side
  const wardrobesList = await db
    .select({
      id: wardrobes.id,
      name: wardrobes.name,
      thumbnail: wardrobes.thumbnail,
      isLocked: wardrobes.isLocked,
      createdAt: wardrobes.createdAt,
      updatedAt: wardrobes.updatedAt,
    })
    .from(wardrobes)
    .where(eq(wardrobes.userId, session.user.id))
    .orderBy(desc(wardrobes.updatedAt));

  // Pass data to client component for interactivity
  return <WardrobesClient initialWardrobes={wardrobesList} />;
}
