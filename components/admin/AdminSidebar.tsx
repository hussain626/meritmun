"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from "react";
import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { Building } from "@/components/icons/Building";
import logo from "@/public/logo.png";
import { Calendar } from "@/components/icons/Calendar";
import { Close } from "@/components/icons/Close";
import { CreditCard } from "@/components/icons/CreditCard";
import { FileText } from "@/components/icons/FileText";
import { Gavel } from "@/components/icons/Gavel";
import { Globe } from "@/components/icons/Globe";
import { Inbox } from "@/components/icons/Inbox";
import { LayoutDashboard } from "@/components/icons/LayoutDashboard";
import { Megaphone } from "@/components/icons/Megaphone";
import { Menu } from "@/components/icons/Menu";
import { Settings } from "@/components/icons/Settings";
import { Shield } from "@/components/icons/Shield";
import { UserPlus } from "@/components/icons/UserPlus";
import { Users } from "@/components/icons/Users";
import { initialsFromName } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type AdminRole = "admin" | "eb" | "reviewer";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
  /** Roles that may see this item. Omit = all roles. */
  roles?: AdminRole[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/registrations", label: "Registrations", icon: FileText },
  { href: "/admin/allotments", label: "Allotments", icon: Gavel },
  { href: "/admin/allotment-rules", label: "Allotment Rules", icon: Settings },
  { href: "/admin/countries", label: "Country Matrix", icon: Globe },
  {
    href: "/admin/queries",
    label: "Queries",
    icon: Inbox,
    roles: ["admin", "eb"],
  },
  {
    href: "/admin/pricing",
    label: "Pricing",
    icon: CreditCard,
    roles: ["admin", "eb"],
  },
  {
    href: "/admin/committees",
    label: "Committees",
    icon: Users,
    roles: ["admin", "eb"],
  },
  {
    href: "/admin/schedule",
    label: "Schedule",
    icon: Calendar,
    roles: ["admin", "eb"],
  },
  {
    href: "/admin/eb",
    label: "EB",
    icon: Shield,
    roles: ["admin", "eb"],
  },
  {
    href: "/admin/sponsors",
    label: "Sponsors",
    icon: Megaphone,
    roles: ["admin", "eb"],
  },
  {
    href: "/admin/secretariat-hods",
    label: "Secretariat & HODs",
    icon: Building,
    roles: ["admin", "eb"],
  },
  {
    href: "/admin/team",
    label: "Team",
    icon: UserPlus,
    roles: ["admin"],
  },
];

const ROLE_SUBTITLE: Record<AdminRole, string> = {
  admin: "System Administrator",
  eb: "Executive Board",
  reviewer: "Reviewer",
};

type AdminSidebarProps = {
  role: AdminRole;
  userName: string;
  onSignOut?: () => void;
  className?: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleItems(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActiveHref(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium",
                "transition-colors duration-[var(--dur-fast)] ease-out",
                "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]",
                active
                  ? "bg-admin-rail-hover text-accent"
                  : "text-admin-rail-muted hover:bg-admin-rail-hover hover:text-admin-rail-fg",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                />
              ) : null}
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <Image
        src={logo}
        alt=""
        aria-hidden
        className="h-10 w-auto shrink-0 object-contain"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-wide text-admin-rail-fg">
          MERITMUN III
        </p>
        <p className="truncate text-[0.6875rem] font-medium text-admin-rail-muted">
          Conference Admin
        </p>
      </div>
    </div>
  );
}

function UserBlock({
  userName,
  role,
  onSignOut,
}: {
  userName: string;
  role: AdminRole;
  onSignOut?: () => void;
}) {
  return (
    <div className="border-t border-admin-rail-hover p-3">
      <div className="flex items-center gap-2.5">
        <InitialsMedallion
          initials={initialsFromName(userName)}
          size="sm"
          className="bg-admin-rail-hover text-admin-rail-fg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-admin-rail-fg">
            {userName}
          </p>
          <p className="truncate text-[0.6875rem] text-admin-rail-muted">
            {ROLE_SUBTITLE[role]}
          </p>
        </div>
      </div>
      {onSignOut ? (
        <button
          type="button"
          onClick={onSignOut}
          className={cn(
            "mt-3 w-full rounded-sm px-2.5 py-1.5 text-left text-xs font-medium",
            "text-admin-rail-muted transition-colors duration-[var(--dur-fast)]",
            "hover:bg-admin-rail-hover hover:text-admin-rail-fg",
            "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        >
          Sign out
        </button>
      ) : null}
    </div>
  );
}

function SidebarChrome({
  role,
  pathname,
  userName,
  onNavigate,
  onSignOut,
  showBrand = true,
}: {
  role: AdminRole;
  pathname: string;
  userName: string;
  onNavigate?: () => void;
  onSignOut?: () => void;
  showBrand?: boolean;
}) {
  const items = visibleItems(role);

  return (
    <div className="flex h-full flex-col">
      {showBrand ? (
        <div className="px-3 py-5">
          <BrandBlock />
        </div>
      ) : null}
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-2 py-1">
        <NavList items={items} pathname={pathname} onNavigate={onNavigate} />
      </nav>
      <UserBlock userName={userName} role={role} onSignOut={onSignOut} />
    </div>
  );
}

export function AdminSidebar({
  role,
  userName,
  onSignOut,
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const first = sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      (previouslyFocused ?? trigger)?.focus();
    };
  }, [open]);

  return (
    <>
      <aside
        className={cn(
          "hidden w-60 shrink-0 bg-admin-rail lg:flex lg:flex-col",
          className,
        )}
      >
        <SidebarChrome
          role={role}
          pathname={pathname}
          userName={userName}
          onSignOut={onSignOut}
        />
      </aside>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        aria-expanded={open}
        className={cn(
          "fixed left-3 top-3 z-40 grid size-10 place-items-center rounded-sm border border-line bg-surface text-fg-muted lg:hidden",
          "shadow-sm transition-[background-color,color,transform] duration-[var(--dur-fast)] ease-out",
          "hover:bg-surface-raised hover:text-fg active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
        )}
      >
        <Menu className="size-5" />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close admin menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-canvas/70 transition-opacity duration-[var(--dur-base)] ease-out",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-admin-rail shadow-md",
            "transition-transform duration-[var(--dur-base)] ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-3 py-4">
            <h2 id={titleId} className="sr-only">
              Admin navigation
            </h2>
            <BrandBlock />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className={cn(
                "grid size-9 place-items-center rounded-sm text-admin-rail-muted",
                "transition-colors duration-[var(--dur-fast)] ease-out",
                "hover:bg-admin-rail-hover hover:text-admin-rail-fg",
                "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
              )}
            >
              <Close className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <SidebarChrome
              role={role}
              pathname={pathname}
              userName={userName}
              showBrand={false}
              onNavigate={() => setOpen(false)}
              onSignOut={
                onSignOut
                  ? () => {
                      setOpen(false);
                      onSignOut();
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
