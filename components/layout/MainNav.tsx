"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/types";

type MainNavProps = {
  items: NavItem[];
  className?: string;
};

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ items, className }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-1">
        {items
          .filter((item) => item.href !== "/register")
          .map((item) => {
            const isActive = isActiveHref(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-9 items-center rounded-sm px-3 text-sm font-medium",
                    "transition-colors duration-[var(--dur-fast)] ease-out",
                    "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
                    isActive ? "text-fg" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {item.label}
                  {/* Gold underline is the active indicator — one of the three
                      sanctioned uses of the accent. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent",
                      "origin-left transition-transform duration-[var(--dur-base)] ease-out",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
