/**
 * Script to set the orderNumber sequence to start at 1001
 * Run with: npx tsx src/db/set-order-sequence.ts
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { resolve } from "path";

// Try multiple env file locations
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in environment.");
  console.error("Make sure DATABASE_URL is set in .env.local or .env");
  process.exit(1);
}

async function setOrderSequence() {
  const sql = neon(DATABASE_URL!);

  try {
    // Set the sequence to start at 1001
    // The SETVAL sets the current value, so next INSERT will get 1001
    await sql`SELECT setval('"order_orderNumber_seq"', 1000, true)`;
    console.log("✅ Order number sequence set to start at 1001");
  } catch (error) {
    console.error("❌ Failed to set sequence:", error);
    process.exit(1);
  }
}

setOrderSequence();
