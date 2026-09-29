// Backblaze B2 object storage — S3-compatible API via @aws-sdk/client-s3.
// Server-only. Used to mint presigned URLs for direct upload/download so
// files never stream through the Next.js server.
import "server-only";

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function configPresent() {
  return Boolean(
    process.env.B2_ENDPOINT &&
      process.env.B2_REGION &&
      process.env.B2_ACCESS_KEY_ID &&
      process.env.B2_SECRET_ACCESS_KEY &&
      process.env.B2_BUCKET
  );
}

export function isB2Configured(): boolean {
  return configPresent();
}

export function getB2Bucket(): string {
  return process.env.B2_BUCKET || "";
}

function getB2Client(): S3Client {
  if (!client) {
    if (!configPresent()) {
      throw new Error(
        "Backblaze B2 not configured. Set B2_ENDPOINT, B2_REGION, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, B2_BUCKET."
      );
    }
    client = new S3Client({
      endpoint: process.env.B2_ENDPOINT, // e.g. https://s3.us-west-003.backblazeb2.com
      region: process.env.B2_REGION || "us-west-003",
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // required for B2 virtual-hosted-style buckets
    });
  }
  return client;
}

/** Mint a PUT presigned URL the browser uploads the file to directly. */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expires = 3600
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: getB2Bucket(),
    Key: key,
    ContentType: contentType,
  });
  const client = getB2Client();
  // @aws-sdk supports `presigner` but the standalone helper keeps this light.
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  return getSignedUrl(client, cmd, { expiresIn: expires });
}

/** Mint a GET presigned URL the browser streams/downloads a file from. */
export async function getPresignedDownloadUrl(
  key: string,
  expires = 3600,
  // 2026-09-28 13:00, when set, the browser saves the file (attachment) instead of playing it inline
  downloadFilename?: string
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: getB2Bucket(),
    Key: key,
    ...(downloadFilename
      ? {
          // B2 rejects RFC 5987 filename*=, so send a plain ASCII filename only
          ResponseContentDisposition: `attachment; filename="${downloadFilename.replace(/[^\x20-\x7e]|["\\]/g, "")}"`,
        }
      : {}),
  });
  const client = getB2Client();
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  return getSignedUrl(client, cmd, { expiresIn: expires });
}

/** Map a TrackType/media state to a sensible content type. */
export function contentTypeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "wav":
      return "audio/wav";
    case "aiff":
    case "aif":
      return "audio/aiff";
    case "mp3":
      return "audio/mpeg";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

/** Generate a namespaced B2 object key for a release asset. */
export function buildObjectKey(
  releaseId: string,
  folder: "tracks" | "covers" | "packs" | "scriptaudio",
  filename: string
): string {
  return `releases/${releaseId}/${folder}/${filename}`;
}