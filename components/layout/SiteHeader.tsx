"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { MainNav } from "@/components/layout/MainNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { registrationOpen } from "@/content/site";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/types";

type SiteHeaderProps = {
  items: NavItem[];
};

/**
 * When the header floats over the hero's dark duotone field, we remap the
 * foreground tokens on the header element itself. Because every utility in
 * this codebase resolves `var(--token)` at use-time (`@theme inline`), this
 * one override recolours the wordmark, nav, and toggle without any of them
 * knowing they are on art. The hero art is dark in BOTH themes, so without
 * this the header would be dark-on-dark in light mode.
 */
const overArtTokens = {
  "--fg": "var(--on-art)",
  "--fg-muted": "color-mix(in oklch, var(--on-art) 78%, transparent)",
  "--accent-fg": "var(--on-art-accent)",
  "--surface-raised": "color-mix(in oklch, var(--on-art) 14%, transparent)",
} as CSSProperties;

export function SiteHeader({ items }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isOverArt = pathname === "/" && !isScrolled;

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={isOverArt ? overArtTokens : undefined}
      className={cn(
        // Negative margin keeps the header sticky while taking no space in
        // flow, so page content starts underneath it. Every page's first
        // section therefore owns a top offset of --header-h.
        "sticky top-0 z-[var(--z-sticky)] -mb-[var(--header-h)] h-[var(--header-h)]",
        "transition-[background-color,border-color,box-shadow] duration-[var(--dur-base)] ease-out",
        // Glass is permitted here only because content genuinely scrolls beneath.
        isScrolled
          ? "border-b border-line bg-[color-mix(in_oklch,var(--bg)_82%,transparent)] shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-full items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="MERITMUN III — home"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-4"
        >
          {/* Wrapped rather than passing a display class into Wordmark: its base
              `inline-flex` and an incoming `hidden` are the same CSS property,
              and cn() does no conflict resolution, so both would render. */}
          <span className="hidden sm:block">
            <Wordmark />
          </span>
          <span className="block sm:hidden">
            <Wordmark variant="mark" />
          </span>
        </Link>

        <div className="flex items-center gap-1 lg:gap-3">
          <MainNav items={items} className="hidden lg:block" />
          <ThemeToggle />
          {registrationOpen ? (
            <ButtonLink href="/register" size="sm">
              Register
              <ArrowRight className="size-4" />
            </ButtonLink>
          ) : (
            <ButtonLink href="/register" size="sm" variant="outline">
              Coming soon
            </ButtonLink>
          )}
          <MobileNav items={items} />
        </div>
      </div>
    </header>
  );
}
