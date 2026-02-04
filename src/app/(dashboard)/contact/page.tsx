import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/db";
import { wardrobes } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ContactClient } from "./ContactClient";

export default async function ContactPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  // Fetch user's wardrobes for optional dropdown
  const userWardrobes = await db
    .select({ id: wardrobes.id, name: wardrobes.name })
    .from(wardrobes)
    .where(
      and(eq(wardrobes.userId, session.user.id), eq(wardrobes.isModel, false)),
    )
    .orderBy(desc(wardrobes.updatedAt));

  return (
    <ContactClient
      wardrobes={userWardrobes}
      userName={session.user.name}
      userEmail={session.user.email}
    />
  );
}
