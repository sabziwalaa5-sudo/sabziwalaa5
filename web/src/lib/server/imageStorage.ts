import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { getSupabaseUrl } from "../supabaseConfig";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export function getProductImagesBucket(): string {
  return process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("Image storage is not configured");
  return key;
}

function getStorageClient() {
  const url = getSupabaseUrl();
  if (!url) throw new Error("Image storage is not configured");
  return createClient(url, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function detectImageMime(buffer: Buffer): string | null {
  for (const entry of MAGIC) {
    if (entry.bytes.every((byte, index) => buffer[index] === byte)) {
      if (entry.mime === "image/webp") {
        const riff = buffer.subarray(8, 12).toString("ascii");
        if (riff !== "WEBP") return null;
      }
      return entry.mime;
    }
  }
  return null;
}

export function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export function validateImageUpload(file: File): { buffer: Buffer; mime: string } {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Invalid upload payload");
  }
  if (file.size <= 0) throw new Error("Empty file");
  if (file.size > MAX_BYTES) throw new Error("Image must be 5 MB or smaller");

  const declared = file.type?.toLowerCase();
  if (!ALLOWED_MIME.has(declared)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed");
  }

  return { buffer: Buffer.alloc(0), mime: declared };
}

export async function readAndValidateImage(file: File): Promise<{ buffer: Buffer; mime: string }> {
  validateImageUpload(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new Error("Image must be 5 MB or smaller");

  const detected = detectImageMime(buffer);
  const declared = file.type?.toLowerCase();
  if (!detected || detected !== declared) {
    throw new Error("Invalid image file");
  }
  return { buffer, mime: detected };
}

export function buildProductImagePath(productId: string, mime: string): string {
  const safeId = productId.replace(/[^a-zA-Z0-9_-]/g, "");
  const token = randomBytes(8).toString("hex");
  return `products/${safeId}/${Date.now()}-${token}.${extensionForMime(mime)}`;
}

export async function uploadProductImage(productId: string, file: File): Promise<{ publicUrl: string; storagePath: string }> {
  const { buffer, mime } = await readAndValidateImage(file);
  const bucket = getProductImagesBucket();
  const storagePath = buildProductImagePath(productId, mime);
  const client = getStorageClient();

  const { error } = await client.storage.from(bucket).upload(storagePath, buffer, {
    contentType: mime,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message || "Image upload failed");

  const { data } = client.storage.from(bucket).getPublicUrl(storagePath);
  if (!data.publicUrl) throw new Error("Failed to resolve image URL");
  return { publicUrl: data.publicUrl, storagePath };
}

export async function deleteProductImage(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath?.trim()) return;
  const bucket = getProductImagesBucket();
  const client = getStorageClient();
  const normalized = storagePath.replace(/^\/+/, "");
  if (normalized.includes("..")) return;
  await client.storage.from(bucket).remove([normalized]);
}

/** Delete a replaced image only after the database points at a different path. */
export async function cleanupReplacedProductImage(
  previousPath: string | null | undefined,
  nextPath: string | null | undefined
): Promise<void> {
  const previous = previousPath?.trim();
  const next = nextPath?.trim();
  if (!previous || !next || previous === next) return;
  await deleteProductImage(previous).catch(() => undefined);
}

export const PRODUCT_IMAGE_MAX_BYTES = MAX_BYTES;

export function isImageStorageConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
