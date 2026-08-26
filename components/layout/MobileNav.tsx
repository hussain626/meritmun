"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Close } from "@/components/icons/Close";
import { Menu } from "@/components/icons/Menu";
import { Wordmark } from "@/components/layout/Wordmark";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/types";

type MobileNavProps = {
  items: NavItem[];
  registrationOpen: boolean;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function MobileNav({ items, registrationOpen }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const firstLink = sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstLink?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
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
      (previouslyFocused ?? trigger)?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className={cn(
          "grid size-11 place-items-center rounded-full text-fg-muted lg:hidden",
          "transition-colors duration-[var(--dur-fast)] ease-out",
          "hover:bg-surface-raised hover:text-fg",
          "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
        )}
      >
        <Menu className="size-5" />
      </button>

      {isOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[var(--z-modal-backdrop)] cursor-default bg-[oklch(0.12_0.02_165/0.7)] backdrop-blur-sm animate-fade"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className={cn(
              "fixed inset-y-0 right-0 z-[var(--z-modal)] flex w-full max-w-sm flex-col",
              "border-l border-line bg-canvas shadow-xl animate-slide-in",
            )}
          >
            <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line px-5">
              <Wordmark variant="mark" />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="grid size-11 place-items-center rounded-full text-fg-muted transition-colors duration-[var(--dur-fast)] ease-out hover:bg-surface-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
              >
                <Close className="size-5" />
              </button>
            </div>

            <nav
              aria-label="Site"
              className="flex-1 overflow-y-auto overscroll-contain px-5 py-6"
            >
              <ul className="space-y-1">
                {items
                  .filter((item) => item.href !== "/register")
                  .map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex min-h-11 items-center rounded-md px-3 text-base font-medium",
                            "transition-colors duration-[var(--dur-fast)] ease-out",
                            isActive
                              ? "bg-brand-soft text-brand-fg"
                              : "text-fg-muted hover:bg-surface hover:text-fg",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
              </ul>

              <p className="mt-8 mb-3 px-3 text-xs font-semibold tracking-caps text-fg-faint uppercase">
                Register
              </p>
              {registrationOpen ? (
                <ul className="space-y-2">
                  {items
                    .find((item) => item.href === "/register")
                    ?.children?.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "block rounded-md border border-line bg-surface p-3",
                            "transition-colors duration-[var(--dur-fast)] ease-out",
                            "hover:border-line-strong",
                            pathname === child.href && "border-brand bg-brand-soft",
                          )}
                        >
                          <span className="block text-sm font-semibold text-fg">
                            {child.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-fg-muted">
                            {child.description}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : (
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md border border-line bg-surface p-3 transition-colors duration-[var(--dur-fast)] ease-out hover:border-line-strong"
                >
                  <span className="block text-sm font-semibold text-fg">
                    Registration coming soon
                  </span>
                  <span className="mt-0.5 block text-xs text-fg-muted">
                    Delegate and delegation forms will open here.
                  </span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
