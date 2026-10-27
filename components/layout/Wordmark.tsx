import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** "mark" renders the emblem alone, used in the mobile header and the footer. */
  variant?: "full" | "mark";
  className?: string;
};

/**
 * The emblem as a single-colour mark. `logo-mark.png` is an alpha mask, so the
 * emblem takes `currentColor` and follows the theme (cream on green, green on
 * cream) instead of carrying its own colours.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        aspectRatio: "578 / 596",
        WebkitMaskImage: "url(/logo-mark.png)",
        maskImage: "url(/logo-mark.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

export function Wordmark({ variant = "full", className }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-3 text-fg", className)}>
      <LogoMark className={variant === "mark" ? "h-8" : "h-10"} />
      {variant === "full" ? (
        <span className="font-display text-[1.4rem] leading-none tracking-[0.12em] whitespace-nowrap uppercase">
          Meritmun <span className="tracking-[0.2em]">III</span>
        </span>
      ) : null}
    </span>
  );
}
