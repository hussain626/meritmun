"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "@/components/icons/ChevronDown";
import { cn } from "@/lib/utils";

type DisclosureProps = {
  question: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function Disclosure({
  question,
  defaultOpen = false,
  className,
  children,
}: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  return (
    <div className={cn("border-b border-line", className)}>
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((open) => !open)}
          className={cn(
            "flex w-full items-center justify-between gap-4 py-5 text-left",
            "text-base font-semibold text-fg transition-colors duration-[var(--dur-fast)] ease-out",
            "hover:text-brand-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        >
          <span>{question}</span>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-fg-faint transition-transform duration-[var(--dur-base)] ease-out",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </h3>
      {/* Grid-rows trick animates to auto height. When collapsed the panel is
          `hidden` so its content leaves the a11y tree and the tab order. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className="grid grid-rows-[1fr] pb-5"
      >
        <div className="min-h-0 max-w-[var(--measure)] text-sm leading-relaxed text-fg-muted">
          {children}
        </div>
      </div>
    </div>
  );
}
