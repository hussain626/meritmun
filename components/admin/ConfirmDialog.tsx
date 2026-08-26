"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Close } from "@/components/icons/Close";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions use a strong danger confirm. */
  tone?: "default" | "danger";
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const confirmBtn = panelRef.current?.querySelector<HTMLElement>(
      '[data-confirm-action="true"]',
    );
    confirmBtn?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        disabled={loading}
        onClick={onClose}
        className="absolute inset-0 bg-canvas/70 transition-opacity duration-[var(--dur-fast)] ease-out"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative w-full max-w-md rounded-md border border-line bg-surface p-5 shadow-md animate-rise"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-lg font-bold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-sm text-fg-muted",
              "transition-colors duration-[var(--dur-fast)] ease-out",
              "hover:bg-surface-raised hover:text-fg",
              "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
              "disabled:opacity-45",
            )}
          >
            <Close className="size-4" />
          </button>
        </div>
        {description ? (
          <div id={descriptionId} className="mt-2 text-sm text-fg-muted">
            {description}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "outline" : "primary"}
            size="sm"
            data-confirm-action="true"
            loading={loading}
            onClick={onConfirm}
            className={
              tone === "danger"
                ? "border-danger text-danger-fg hover:border-danger hover:bg-surface-inset hover:text-danger-fg"
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
