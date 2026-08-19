"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Close } from "@/components/icons/Close";
import { HelpCircle } from "@/components/icons/HelpCircle";
import { cn } from "@/lib/utils";
import type { FaqEntry } from "@/lib/types";

type HelpWidgetProps = {
  faqs: FaqEntry[];
};

export function HelpWidget({ faqs }: HelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="fixed right-4 bottom-4 z-[var(--z-widget)] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Quick help"
          className={cn(
            "w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line",
            "bg-surface-raised shadow-xl animate-rise",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-fg">Need a hand?</p>
              <p className="mt-0.5 text-xs text-fg-muted">
                The three we get asked most.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close help"
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-fg-muted transition-colors duration-[var(--dur-fast)] ease-out hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            >
              <Close className="size-4" />
            </button>
          </div>

          <ul className="max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain">
            {faqs.map((faq) => {
              const isExpanded = openFaqId === faq.id;
              return (
                <li key={faq.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setOpenFaqId(isExpanded ? null : faq.id)
                    }
                    className="w-full px-4 py-3 text-left text-sm font-medium text-fg transition-colors duration-[var(--dur-fast)] ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2"
                  >
                    {faq.question}
                  </button>
                  {isExpanded ? (
                    <p className="px-4 pb-3.5 text-xs leading-relaxed text-fg-muted">
                      {faq.answer}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line bg-surface px-4 py-3">
            <Link
              href="/contact"
              className="inline-flex items-center text-sm font-semibold text-brand-fg underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-accent-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            >
              Ask us something else
            </Link>
          </div>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close help" : "Open help — frequently asked questions"}
        className={cn(
          "flex h-13 items-center gap-2.5 rounded-full bg-accent px-5 text-on-accent shadow-accent",
          "transition-[transform,background-color] duration-[var(--dur-fast)] ease-out",
          "hover:-translate-y-0.5 hover:bg-accent-strong active:translate-y-0",
          "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
        )}
      >
        <HelpCircle className="size-5" />
        <span className="text-sm font-semibold">Help</span>
      </button>
    </div>
  );
}
