import "server-only";
import { getDemoStore } from "@/lib/admin/demo-store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Transfer screenshots attached when a payment is confirmed. Live: a private
 * Supabase Storage bucket (migration 009) readable only by admins and the EB.
 * Demo: kept in memory so the flow can be exercised without Supabase.
 */

export const PROOF_BUCKET = "payment-proofs";
/** Stay under Netlify's 6 MB function payload and the 6 MB action limit. */
export const PROOF_MAX_BYTES = 4 * 1024 * 1024;

const PROOF_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export type ProofKind = "delegate" | "delegation";

/** Returns a reason the file cannot be accepted, or null when it is fine. */
export function validateProof(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return "Attach the payment screenshot before confirming.";
  }
  if (!PROOF_TYPES[file.type]) {
    return "The screenshot must be a PNG, JPG, WEBP, HEIC image or a PDF.";
  }
  if (file.size > PROOF_MAX_BYTES) {
    return "The screenshot is larger than 4 MB. Crop or compress it and try again.";
  }
  return null;
}

/** Store a validated proof and return its storage path. */
export async function saveProof(
  kind: ProofKind,
  id: string,
  file: File,
): Promise<string> {
  const ext = PROOF_TYPES[file.type] ?? "bin";
  const path = `${kind}/${id}/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!isSupabaseConfigured()) {
    getDemoStore().paymentProofs[path] = {
      contentType: file.type,
      base64: Buffer.from(bytes).toString("base64"),
    };
    return path;
  }

  const client = await createClient();
  const { error } = await client.storage
    .from(PROOF_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Best-effort cleanup when the confirmation fails after the upload. */
export async function removeProof(path: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    delete getDemoStore().paymentProofs[path];
    return;
  }
  try {
    const client = await createClient();
    await client.storage.from(PROOF_BUCKET).remove([path]);
  } catch (error) {
    console.warn("[meritmun/admin] removeProof", error);
  }
}

/**
 * Where to view a proof: a short-lived signed URL (live) or a data URL
 * (demo). Null when the file cannot be found or read.
 */
export async function proofUrl(path: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    const proof = getDemoStore().paymentProofs[path];
    return proof ? `data:${proof.contentType};base64,${proof.base64}` : null;
  }
  const client = await createClient();
  const { data, error } = await client.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) {
    console.warn("[meritmun/admin] proofUrl", error.message);
    return null;
  }
  return data.signedUrl;
}

export function isPdfProof(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}
