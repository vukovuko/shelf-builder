import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

const IMAGES_DIR = path.join(process.cwd(), "material-images");

async function uploadToR2() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
  } = process.env;

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME
  ) {
    console.error("Missing R2 credentials in .env");
    console.error("Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME");
    process.exit(1);
  }

  // Check if images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`Images directory not found: ${IMAGES_DIR}`);
    console.error("Make sure the 'material-images' folder exists in the project root");
    process.exit(1);
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith(".jpg"));
  console.log(`Found ${files.length} images to upload`);

  if (files.length === 0) {
    console.error("No .jpg files found in the images directory");
    process.exit(1);
  }

  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const fileContent = fs.readFileSync(filePath);

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `materials/${file}`,
          Body: fileContent,
          ContentType: "image/jpeg",
        })
      );

      uploaded++;
      if (uploaded % 50 === 0) {
        console.log(`Uploaded ${uploaded}/${files.length}`);
      }
    } catch (error) {
      console.error(`Failed to upload ${file}:`, error);
      failed++;
    }
  }

  console.log(`\nDone! Uploaded ${uploaded}/${files.length} images to R2`);
  if (failed > 0) {
    console.log(`Failed: ${failed} images`);
  }
}

uploadToR2().catch(console.error);
