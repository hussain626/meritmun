"use client";

import { useActionState, useState } from "react";
import { CloudUpload } from "@/components/icons/CloudUpload";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { uploadPaymentScreenshot, type UploadState } from "@/lib/payment-actions";
import { formatAdminDateTime } from "@/lib/utils";

export function UploadForm({
  token,
  uploadedAt,
}: {
  token: string;
  uploadedAt: string | null;
}) {
  const [state, action, pending] = useActionState<UploadState, FormData>(
    uploadPaymentScreenshot,
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const done = state?.ok === true;

  return (
    <section className="mt-8 rounded-md border border-line-strong bg-surface p-5 sm:p-6">
      <h2 className="text-base font-semibold text-fg">Your transfer screenshot</h2>
      {uploadedAt && !done ? (
        <p className="mt-2 text-sm text-fg-muted">
          We already have a screenshot from {formatAdminDateTime(uploadedAt)}. Upload
          again only if it was the wrong one.
        </p>
      ) : null}

      {done ? (
        <Alert tone="success" title="Screenshot received" className="mt-4" live="polite">
          {state.message}
        </Alert>
      ) : (
        <form action={action} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-surface-inset px-4 py-8 text-center text-sm text-fg-muted hover:border-brand focus-within:outline-2 focus-within:outline-focus">
            <CloudUpload className="size-6 text-brand-fg" />
            <span className="font-medium text-fg">
              {fileName ?? "Choose a screenshot or PDF"}
            </span>
            <span className="text-xs text-fg-faint">PNG, JPG, WEBP, HEIC or PDF, up to 4 MB</span>
            <input
              type="file"
              name="proof"
              required
              accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          {state && !state.ok ? (
            <Alert tone="danger" live="polite">
              {state.message}
            </Alert>
          ) : null}
          <Button type="submit" loading={pending} loadingLabel="Uploading…" className="self-start">
            Upload screenshot
          </Button>
        </form>
      )}
    </section>
  );
}
