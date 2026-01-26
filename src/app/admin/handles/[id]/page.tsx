import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { handles, handleFinishes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { HandleDetailClient } from "./HandleDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HandleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const handleId = Number.parseInt(id, 10);

  if (Number.isNaN(handleId)) {
    notFound();
  }

  const [handle] = await db
    .select()
    .from(handles)
    .where(eq(handles.id, handleId));

  if (!handle) {
    notFound();
  }

  // Fetch finishes for this handle
  const finishes = await db
    .select()
    .from(handleFinishes)
    .where(eq(handleFinishes.handleId, handleId));

  const serializedHandle = {
    ...handle,
    createdAt: handle.createdAt.toISOString(),
    updatedAt: handle.updatedAt.toISOString(),
    finishes: finishes.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  };

  return <HandleDetailClient handle={serializedHandle} />;
}
