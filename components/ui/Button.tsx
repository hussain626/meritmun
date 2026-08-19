import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-strong hover:shadow-accent active:translate-y-px active:shadow-none",
  secondary: "bg-brand text-on-brand hover:bg-brand-strong active:translate-y-px",
  outline:
    "border border-line-strong text-fg hover:border-brand hover:text-brand-fg active:translate-y-px",
  ghost: "text-fg-muted hover:bg-surface-raised hover:text-fg",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-base gap-2",
  lg: "h-13 px-7 text-lg gap-2.5",
};

const base = cn(
  "relative inline-flex items-center justify-center rounded-md font-semibold tracking-tight",
  "whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform]",
  "duration-[var(--dur-fast)] ease-out",
  "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
  "disabled:pointer-events-none disabled:opacity-45",
);

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof StyleProps
>;
type NativeAnchorProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof StyleProps
>;

export type ButtonProps = StyleProps &
  NativeButtonProps & {
    href?: undefined;
    loading?: boolean;
    loadingLabel?: string;
  };

export type ButtonLinkProps = StyleProps &
  NativeAnchorProps & {
    href: string;
    external?: boolean;
  };

function styleFor({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: Pick<StyleProps, "variant" | "size" | "fullWidth" | "className">) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[1.15em] animate-spin"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        opacity={0.28}
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Button({
  variant,
  size,
  iconStart,
  iconEnd,
  fullWidth,
  className,
  children,
  loading = false,
  loadingLabel = "Working…",
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={styleFor({ variant, size, fullWidth, className })}
    >
      {/* The label stays in flow (merely invisible) while loading, so the
          button never changes width mid-submit — a reflowing primary CTA
          reads as a broken form. */}
      <span
        className={cn(
          "inline-flex items-center gap-[inherit]",
          loading && "invisible",
        )}
      >
        {iconStart}
        {children}
        {iconEnd}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
          <span className="sr-only">{loadingLabel}</span>
        </span>
      ) : null}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  iconStart,
  iconEnd,
  fullWidth,
  className,
  children,
  href,
  external = false,
  ...rest
}: ButtonLinkProps) {
  const classes = styleFor({ variant, size, fullWidth, className });
  const content = (
    <span className="inline-flex items-center gap-[inherit]">
      {iconStart}
      {children}
      {iconEnd}
    </span>
  );

  if (external) {
    return (
      <a {...rest} href={href} target="_blank" rel="noreferrer" className={classes}>
        {content}
      </a>
    );
  }

  return (
    <Link {...rest} href={href} className={classes}>
      {content}
    </Link>
  );
}
