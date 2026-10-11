import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | undefined;

/** Uploads to the public R2 bucket and returns the object's public URL. */
export async function putR2Object(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_BASE_URL,
  } = process.env;
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME ||
    !R2_BASE_URL
  ) {
    throw new Error("R2 is not configured");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${R2_BASE_URL}/${key}`;
}
