import Image from "next/image";
import logo from "@/public/logo.png";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** "mark" renders the logo alone — used in the mobile header and the footer. */
  variant?: "full" | "mark";
  className?: string;
};

export function Wordmark({ variant = "full", className }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={logo}
        alt=""
        aria-hidden="true"
        priority
        className={cn(
          "w-auto shrink-0 object-contain",
          variant === "mark" ? "h-8" : "h-10",
        )}
      />
      {variant === "full" ? (
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="font-display text-[1.35rem] font-bold tracking-tight text-fg">
            MERITMUN
          </span>
          <span className="font-display text-[1.35rem] font-bold tracking-tight text-accent-fg">
            III
          </span>
        </span>
      ) : null}
    </span>
  );
}
