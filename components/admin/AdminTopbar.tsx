"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Bell } from "@/components/icons/Bell";
import { Search } from "@/components/icons/Search";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import systemSummitLogo from "@/public/systemsummit-logo.png";
import { cn } from "@/lib/utils";

const SEARCH_META: { test: (path: string) => boolean; placeholder: string; href: string }[] = [
  {
    test: (p) => p === "/admin",
    placeholder: "Search ID, Name...",
    href: "/admin/registrations",
  },
  {
    test: (p) => p.startsWith("/admin/committees"),
    placeholder: "Search committees, delegates...",
    href: "/admin/committees",
  },
  {
    test: (p) => p.startsWith("/admin/eb"),
    placeholder: "Search EB members...",
    href: "/admin/eb",
  },
  {
    test: (p) => p.startsWith("/admin/secretariat-hods"),
    placeholder: "Search members, roles...",
    href: "/admin/secretariat-hods",
  },
  {
    test: (p) => p.startsWith("/admin/sponsors"),
    placeholder: "Search...",
    href: "/admin/sponsors",
  },
  {
    test: (p) => p.startsWith("/admin/team"),
    placeholder: "Search team...",
    href: "/admin/team",
  },
  {
    test: (p) => p.startsWith("/admin/registrations"),
    placeholder: "Global search...",
    href: "/admin/registrations",
  },
  {
    test: (p) => p.startsWith("/admin/pricing"),
    placeholder: "Search pricing...",
    href: "/admin/pricing",
  },
  {
    test: (p) => p.startsWith("/admin/allotments"),
    placeholder: "Search allotments...",
    href: "/admin/allotments",
  },
  {
    test: (p) => p.startsWith("/admin/queries"),
    placeholder: "Search queries...",
    href: "/admin/queries",
  },
];

function resolveSearch(pathname: string) {
  return (
    SEARCH_META.find((item) => item.test(pathname)) ?? {
      placeholder: "Search...",
      href: "/admin/registrations",
    }
  );
}

type AdminTopbarProps = {
  alertCount?: number;
  className?: string;
};

export function AdminTopbar({
  alertCount = 0,
  className,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const search = resolveSearch(pathname);
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    const url = q
      ? `${search.href}?q=${encodeURIComponent(q)}`
      : search.href;
    router.push(url);
  }

  return (
    <header
      className={cn(
        "flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6",
        className,
      )}
    >
      <form
        onSubmit={handleSearch}
        className="relative ml-12 min-w-0 flex-1 lg:ml-0"
        role="search"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={search.placeholder}
          aria-label={search.placeholder}
          className={cn(
            "h-10 w-full max-w-xl rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-fg",
            "placeholder:text-fg-faint",
            "transition-colors duration-[var(--dur-fast)]",
            "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle className="size-9" />
        <Link
          href="/admin/queries"
          aria-label={
            alertCount > 0
              ? `${alertCount} open queries`
              : "Notifications"
          }
          className={cn(
            "relative grid size-9 place-items-center rounded-full text-fg-muted",
            "transition-colors duration-[var(--dur-fast)]",
            "hover:bg-surface-inset hover:text-fg",
            "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        >
          <Bell className="size-5" />
          {alertCount > 0 ? (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger"
            />
          ) : null}
        </Link>
        <a
          href="https://systemsummit.online"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Powered by SystemSummit"
          className={cn(
            "flex items-center gap-2 rounded-sm px-1.5 py-1",
            "transition-colors duration-[var(--dur-fast)]",
            "hover:bg-surface-inset",
            "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        >
          <span className="hidden text-[0.6875rem] font-medium uppercase tracking-wide text-fg-faint sm:inline">
            Powered by
          </span>
          <Image
            src={systemSummitLogo}
            alt=""
            aria-hidden
            className="h-8 w-auto object-contain"
          />
        </a>
      </div>
    </header>
  );
}
