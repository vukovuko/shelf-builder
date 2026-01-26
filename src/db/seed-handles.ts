import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { handles, handleFinishes } from "./schema";
import handlesData from "../lib/handles.json";

interface HandleFinishJson {
  id: string;
  name: string;
  image: string;
  price: number;
  costPrice: number;
}

interface HandleJson {
  id: string;
  name: string;
  description: string;
  mainImage: string;
  finishes: HandleFinishJson[];
}

async function seedHandles() {
  const { DATABASE_URL, R2_BASE_URL } = process.env;

  if (!DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env");
    process.exit(1);
  }

  if (!R2_BASE_URL) {
    console.error("Missing R2_BASE_URL in .env");
    process.exit(1);
  }

  // R2 handles folder path
  const handlesBaseUrl = `${R2_BASE_URL}/handles`;

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  const data = (handlesData as { handles: HandleJson[] }).handles;
  console.log(`Seeding ${data.length} handles...`);
  console.log(`Using R2 base URL: ${handlesBaseUrl}`);

  // Delete existing handle finishes first (due to FK constraint)
  await db.delete(handleFinishes);
  console.log("Deleted existing handle finishes");

  // Delete existing handles
  await db.delete(handles);
  console.log("Deleted existing handles");

  // Insert handles and their finishes
  for (const h of data) {
    // Build full R2 URL for main image
    const mainImageUrl = `${handlesBaseUrl}/${h.mainImage}`;

    // Insert handle
    const [insertedHandle] = await db
      .insert(handles)
      .values({
        legacyId: h.id, // e.g., "handle_1"
        name: h.name,
        description: h.description,
        mainImage: mainImageUrl,
        published: true,
      })
      .returning({ id: handles.id });

    console.log(
      `Inserted handle: ${h.name} (id=${insertedHandle.id}, legacyId=${h.id})`,
    );
    console.log(`  → Main image: ${mainImageUrl}`);

    // Insert finishes for this handle
    const finishRecords = h.finishes.map((f) => ({
      handleId: insertedHandle.id,
      legacyId: f.id, // e.g., "chrome"
      name: f.name,
      image: `${handlesBaseUrl}/${f.image}`, // Full R2 URL
      price: f.price, // Selling price in RSD (prodajna)
      costPrice: f.costPrice, // Cost price in RSD (nabavna)
    }));

    await db.insert(handleFinishes).values(finishRecords);
    console.log(
      `  → Inserted ${finishRecords.length} finishes (prices in RSD)`,
    );
  }

  console.log("\nDone! All handles seeded successfully.");
}

seedHandles().catch(console.error);
