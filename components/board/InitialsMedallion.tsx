import { cn } from "@/lib/utils";

export type MedallionSize = "sm" | "md" | "lg";

const sizes: Record<MedallionSize, string> = {
  sm: "size-9 text-sm",
  md: "size-12 text-base",
  lg: "size-16 text-h3",
};

type InitialsMedallionProps = {
  initials: string;
  size?: MedallionSize;
  className?: string;
};

/**
 * Stands in for a photograph until real portraits exist. Always decorative —
 * the person's name is rendered adjacent in text, so announcing the initials
 * again would only repeat it.
 */
export function InitialsMedallion({
  initials,
  size = "md",
  className,
}: InitialsMedallionProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "font-display font-bold tracking-tight",
        "bg-brand-soft text-brand-fg",
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
