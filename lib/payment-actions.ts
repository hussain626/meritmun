"use server";

import { revalidatePath } from "next/cache";
import { getDemoStore } from "@/lib/admin/demo-store";
import { saveProof, validateProof } from "@/lib/admin/payment-proof";
import { loadPaymentTarget } from "@/lib/payment-upload";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";

export type UploadState = { ok: boolean; message: string } | null;

/**
 * A registrant uploads their transfer screenshot from the private link in
 * their confirmation email. It is attached to the registration for Finance to
 * check; the payment stays pending until staff confirm it.
 */
export async function uploadPaymentScreenshot(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const token = String(formData.get("token") ?? "");
  let target;
  try {
    target = await loadPaymentTarget(token);
  } catch (error) {
    console.warn("[meritmun] uploadPaymentScreenshot load", error);
    return { ok: false, message: "Uploads are unavailable right now. Please try again later." };
  }
  if (!target) return { ok: false, message: "This link is not valid. Use the link in your confirmation email." };
  if (target.status === "confirmed") {
    return { ok: false, message: "This payment is already confirmed, nothing more to upload." };
  }

  const file = formData.get("proof");
  const invalid = validateProof(file);
  if (invalid) return { ok: false, message: invalid };

  const now = new Date().toISOString();
  try {
    const path = await saveProof(target.kind, target.id, file as File, "registrant");

    if (!isSupabaseConfigured()) {
      const store = getDemoStore();
      const record =
        target.kind === "delegate"
          ? store.delegates.find((d) => d.id === target.id)
          : store.delegations.find((d) => d.id === target.id);
      if (!record) throw new Error("registration vanished");
      record.paymentProofPath = path;
      record.paymentProofUploadedAt = now;
      if (record.paymentStatus === "rejected") {
        record.paymentStatus = "pending";
        if ("rejectionReason" in record) record.rejectionReason = null;
      }
      record.updatedAt = now;
    } else {
      const client = createServiceClient();
      if (!client) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
      // A rejected payment reopens: the new screenshot goes back to Finance.
      const { error } = await client
        .from(target.kind === "delegate" ? "delegates" : "delegations")
        .update({
          payment_proof_path: path,
          payment_proof_uploaded_at: now,
          payment_status: "pending",
          payment_rejected_at: null,
          rejection_reason: null,
          updated_at: now,
        })
        .eq("id", target.id)
        .neq("payment_status", "confirmed");
      if (error) throw error;
    }
  } catch (error) {
    console.warn("[meritmun] uploadPaymentScreenshot save", error);
    return {
      ok: false,
      message: "The screenshot could not be saved. Please try again, or reply to your confirmation email with it.",
    };
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/finances");
  return {
    ok: true,
    message: "Finance will match it to your payment and email you once it is confirmed.",
  };
}
