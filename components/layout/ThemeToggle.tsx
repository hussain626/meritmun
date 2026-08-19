"use client";

import { Moon } from "@/components/icons/Moon";
import { Sun } from "@/components/icons/Sun";
import { applyTheme, storeTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

/**
 * Deliberately stateless. The blocking script in <head> is the single source of
 * truth for the active theme, and which glyph/label shows is driven purely by
 * the `[data-theme]` attribute in CSS. That means no hydration mismatch, no
 * setState-in-effect, and a correct-looking control before React ever runs.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  function toggle() {
    const current = document.documentElement.dataset.theme;
    const next: Theme = current === "light" ? "dark" : "light";
    applyTheme(next);
    storeTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "relative grid size-10 place-items-center rounded-full text-fg-muted",
        "transition-colors duration-[var(--dur-fast)] ease-out",
        "hover:bg-surface-raised hover:text-fg",
        "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
        className,
      )}
    >
      {/* Exactly one of these is in the a11y tree at a time, so the button's
          accessible name always names the ACTION, not the current state. */}
      <span className="sr-only [[data-theme=light]_&]:hidden">
        Switch to light theme
      </span>
      <span className="sr-only hidden [[data-theme=light]_&]:inline">
        Switch to dark theme
      </span>

      <Sun
        aria-hidden="true"
        className={cn(
          "absolute size-5 transition-[opacity,transform] duration-[var(--dur-base)] ease-out",
          "-rotate-90 scale-75 opacity-0",
          "[[data-theme=light]_&]:rotate-0 [[data-theme=light]_&]:scale-100 [[data-theme=light]_&]:opacity-100",
        )}
      />
      <Moon
        aria-hidden="true"
        className={cn(
          "absolute size-5 transition-[opacity,transform] duration-[var(--dur-base)] ease-out",
          "rotate-0 scale-100 opacity-100",
          "[[data-theme=light]_&]:rotate-90 [[data-theme=light]_&]:scale-75 [[data-theme=light]_&]:opacity-0",
        )}
      />
    </button>
  );
}
