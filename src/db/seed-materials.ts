import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { materials } from "./schema";
import materialsData from "../data/materials-final.json";

interface MaterialJson {
  id: number;
  name: string;
  price: number;
  img: string;
  thickness: number;
  stock: number;
  productCode: string;
  vrsta: string;
  dimenzija: string;
  nacinProdaje: string;
  cenaOriginal: string;
  link: string;
  imageUrlOriginal: string;
}

// Categories based on vrsta
function getCategoriesFromVrsta(vrsta: string): string[] {
  if (vrsta === "HDF") {
    // HDF is only for backs (3mm)
    return ["Materijal za Leđa (3mm)"];
  }
  // IVERICA, MDF SJAJ, MDF MAT → used for both korpus AND lica/vrata
  return ["Materijal za Korpus (18mm)", "Materijal za Lica/Vrata (18mm)"];
}

async function seedMaterials() {
  const { DATABASE_URL, R2_BASE_URL } = process.env;

  if (!DATABASE_URL || !R2_BASE_URL) {
    console.error("Missing DATABASE_URL or R2_BASE_URL in .env");
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  const data = materialsData as MaterialJson[];
  console.log(`Seeding ${data.length} materials...`);

  // Delete existing materials
  await db.delete(materials);
  console.log("Deleted existing materials");

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    const records = batch.map((m) => ({
      name: m.name,
      productCode: m.productCode,
      price: m.price,
      img: `${R2_BASE_URL}/materials/${m.img}`,
      thickness: Math.round(m.thickness),
      stock: m.stock,
      categories: getCategoriesFromVrsta(m.vrsta),
      published: true,
    }));

    await db.insert(materials).values(records);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${data.length}`);
  }

  console.log("\nDone! All materials seeded successfully.");
}

seedMaterials().catch(console.error);
