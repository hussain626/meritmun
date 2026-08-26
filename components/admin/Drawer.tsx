"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Close } from "@/components/icons/Close";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider detail panels for dense forms. */
  size?: "md" | "lg";
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const closeBtn = panelRef.current?.querySelector<HTMLElement>(
      '[data-drawer-close="true"]',
    );
    closeBtn?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
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
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close drawer"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-canvas/70 transition-opacity duration-[var(--dur-base)] ease-out",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-md",
          size === "lg" ? "max-w-xl" : "max-w-md",
          "transition-transform duration-[var(--dur-base)] ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2
            id={titleId}
            className="font-display text-lg font-bold tracking-tight text-fg"
          >
            {title}
          </h2>
          <button
            type="button"
            data-drawer-close="true"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-sm text-fg-muted",
              "transition-colors duration-[var(--dur-fast)] ease-out",
              "hover:bg-surface-raised hover:text-fg",
              "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
            )}
          >
            <Close className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-inset px-4 py-3 sm:px-5">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
