/**
 * Storage Service — AWS S3 + Local Disk Fallback
 *
 * Cloud mode (S3): enabled when AWS_S3_BUCKET + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY are set.
 *   Files are uploaded to S3 and served via CloudFront or direct S3 URL.
 *
 * Local mode: fallback for development or single-server deployments.
 *   Files stored in ./uploads/<folder>/ and served via /uploads route.
 *
 * NOTE: For auto-scaling (multiple servers), S3 mode MUST be used so all
 * servers can access the same files. Local mode only works on a single server.
 */

import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export interface StorageOptions {
  fileName: string;
  folder: string;
  buffer: Buffer;
  mimeType: string;
}

export interface StorageResult {
  url: string;
  path: string;
  provider: "local" | "s3";
}

// =============================================
// S3 CLIENT (lazy-initialized)
// =============================================
let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;

  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "eu-west-2";

  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return s3Client;
}

// =============================================
// STORAGE SERVICE
// =============================================
export class StorageService {
  private static localUploadDir = path.join(process.cwd(), "uploads");

  public static async uploadFile(options: StorageOptions): Promise<StorageResult> {
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "eu-west-2";
    const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;

    if (client && bucket) {
      // Cloud Storage — AWS S3
      const key = `${options.folder}/${Date.now()}-${options.fileName}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: options.buffer,
          ContentType: options.mimeType,
        })
      );

      // Use CloudFront URL if available, otherwise direct S3 URL
      const url = cloudFrontUrl
        ? `${cloudFrontUrl.replace(/\/$/, "")}/${key}`
        : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      return { url, path: key, provider: "s3" };
    }

    // Fallback: Local Disk Storage
    const targetDir = path.join(this.localUploadDir, options.folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${options.fileName}`;
    const filePath = path.join(targetDir, uniqueName);
    await fs.promises.writeFile(filePath, options.buffer);

    const relativeUrl = `/uploads/${options.folder}/${uniqueName}`;
    return { url: relativeUrl, path: filePath, provider: "local" };
  }

  public static async deleteFile(filePath: string, provider: "local" | "s3" = "local"): Promise<void> {
    if (provider === "s3") {
      const client = getS3Client();
      const bucket = process.env.AWS_S3_BUCKET;
      if (client && bucket) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: filePath }));
      }
    } else {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // File may already be deleted — ignore
      }
    }
  }
}
